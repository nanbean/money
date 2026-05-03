// Read-only: classify "orphan" transfer transactions — those whose
// counterpart can't be located by the standard heuristic. Categorizes by
// failure mode so you can decide which buckets to fix vs. leave alone.
const dotenv = require('dotenv');
const path = require('path');

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production';
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile) });

const config = require('../config');

const isInternalTransferCategory = (cat) => !!cat && /^\[.*\]$/.test(cat);
const SAMPLE_LIMIT = 8;

const main = async () => {
	const nanoUrl = `https://${encodeURIComponent(config.couchDBAdminId)}:${encodeURIComponent(config.couchDBAdminPassword)}@${config.couchDBUrl}`;
	const nano = require('nano')(nanoUrl);
	const txDB = nano.use('transactions_nanbean');
	const accDB = nano.use('accounts_nanbean');

	const [txResp, accResp] = await Promise.all([
		txDB.list({ include_docs: true }),
		accDB.list({ include_docs: true })
	]);
	const allTransactions = txResp.rows.map(r => r.doc).filter(d => d && !d._id.startsWith('_'));
	const accountList = accResp.rows.map(r => r.doc).filter(d => d && !d._id.startsWith('_'));

	const accByName = new Map(accountList.map(a => [a.name, a]));
	const transferTxs = allTransactions.filter(t => isInternalTransferCategory(t.category));

	// Visited: pair-up greedily so each tx is judged at most once. We mirror
	// the migration's matching (date + counter accountId + opposite sign +
	// |amount| equal, single candidate only).
	const visited = new Set();
	const orphans = [];

	for (const tx of transferTxs) {
		if (visited.has(tx._id)) continue;
		const counterName = tx.category.replace(/^\[|\]$/g, '');
		const selfName = tx.accountId ? tx.accountId.split(':')[2] : null;
		const counterMeta = accByName.get(counterName);

		let bucket = null;
		let detail = null;

		if (!selfName) {
			bucket = 'no_self_name';
		} else if (counterName === selfName) {
			bucket = 'self_referential';
			detail = { counterName };
		} else if (!counterMeta) {
			bucket = 'counter_account_missing';
			detail = { counterName };
		} else if (Number(tx.amount) === 0) {
			bucket = 'zero_amount';
		} else {
			const counterAccountId = `account:${counterMeta.type}:${counterName}`;
			const expectedCategory = `[${selfName}]`;
			const tAmt = Number(tx.amount) || 0;
			const tSign = Math.sign(tAmt);
			const tAbs = Math.abs(tAmt);
			const candidates = transferTxs.filter(p => {
				const pAmt = Number(p.amount) || 0;
				return p._id !== tx._id
					&& !visited.has(p._id)
					&& p.accountId === counterAccountId
					&& p.category === expectedCategory
					&& p.date === tx.date
					&& Math.sign(pAmt) === -tSign
					&& Math.abs(pAmt) === tAbs;
			});
			if (candidates.length === 1) {
				visited.add(tx._id);
				visited.add(candidates[0]._id);
				continue; // not orphan
			}
			if (candidates.length > 1) {
				visited.add(tx._id);
				continue; // ambiguous — handled by inspectAmbiguousTransfers
			}

			// Drill into the failure: same accountIds + date + opposite sign,
			// but |amount| didn't match → cross-currency or sign-mismatch.
			const looseSameDay = transferTxs.filter(p =>
				p._id !== tx._id
				&& p.accountId === counterAccountId
				&& p.category === expectedCategory
				&& p.date === tx.date
			);
			if (looseSameDay.length > 0) {
				const oppositeSignButDiffAbs = looseSameDay.some(p =>
					Math.sign(Number(p.amount) || 0) === -tSign
					&& Math.abs(Number(p.amount) || 0) !== tAbs
				);
				if (oppositeSignButDiffAbs) {
					bucket = 'cross_currency_or_amount_drift';
					detail = { sameDayCount: looseSameDay.length };
				} else {
					bucket = 'same_day_same_sign'; // both sides positive or both negative
					detail = { sameDayCount: looseSameDay.length };
				}
			} else {
				bucket = 'no_counter_on_date';
			}
		}

		orphans.push({ tx, bucket, detail });
		visited.add(tx._id);
	}

	console.log(`Total orphans: ${orphans.length}\n`);

	const byBucket = new Map();
	for (const o of orphans) {
		if (!byBucket.has(o.bucket)) byBucket.set(o.bucket, []);
		byBucket.get(o.bucket).push(o);
	}

	const ordered = ['self_referential', 'counter_account_missing', 'zero_amount',
		'cross_currency_or_amount_drift', 'same_day_same_sign',
		'no_counter_on_date', 'no_self_name'];

	for (const bucket of ordered) {
		const list = byBucket.get(bucket);
		if (!list || list.length === 0) continue;
		console.log(`════════ ${bucket}  (${list.length}) ════════`);

		if (bucket === 'counter_account_missing') {
			const byName = new Map();
			for (const o of list) {
				const n = o.detail.counterName;
				if (!byName.has(n)) byName.set(n, []);
				byName.get(n).push(o);
			}
			console.log(`  Distinct missing counter names: ${byName.size}`);
			const sorted = Array.from(byName.entries()).sort((a, b) => b[1].length - a[1].length);
			for (const [name, items] of sorted) {
				console.log(`    [${name}] × ${items.length}  e.g. ${items[0].tx._id}  (date=${items[0].tx.date}, amt=${items[0].tx.amount})`);
			}
			console.log('');
			continue;
		}

		if (bucket === 'self_referential') {
			console.log('  All cases (category points at self):');
			for (const o of list.slice(0, SAMPLE_LIMIT)) {
				console.log(`    ${o.tx._id}  cat=${o.tx.category}  amt=${o.tx.amount}  payee=${o.tx.payee || ''}`);
			}
			if (list.length > SAMPLE_LIMIT) console.log(`    ... and ${list.length - SAMPLE_LIMIT} more`);
			console.log('');
			continue;
		}

		// Generic dump for the remaining buckets
		for (const o of list.slice(0, SAMPLE_LIMIT)) {
			const ext = `${o.tx.payee || ''} ${o.tx.memo ? '/' + o.tx.memo : ''}`.trim();
			const detail = o.detail ? ` ${JSON.stringify(o.detail)}` : '';
			console.log(`  ${o.tx._id}  cat=${o.tx.category}  amt=${o.tx.amount}  ${ext}${detail}`);
		}
		if (list.length > SAMPLE_LIMIT) console.log(`  ... and ${list.length - SAMPLE_LIMIT} more`);
		console.log('');
	}

	console.log('Bucket totals:');
	for (const bucket of ordered) {
		const list = byBucket.get(bucket);
		if (list) console.log(`  ${bucket.padEnd(34)} ${list.length}`);
	}
};

main().catch(err => {
	console.error(err);
	process.exit(1);
});
