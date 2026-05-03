// Read-only: dumps every ambiguous transfer pairing for human review.
// Groups by (date, account-pair, |amount|, category) so colliding txns
// appear together with their payee/memo/rev — easier to judge what to do.
const dotenv = require('dotenv');
const path = require('path');

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production';
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile) });

const config = require('../config');

const isInternalTransferCategory = (cat) => !!cat && /^\[.*\]$/.test(cat);

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

	// Collect every tx whose own counterpart resolution has >1 candidate.
	// We don't use a visited set so a 4-tx cluster surfaces as 4 hits, then
	// we coalesce to a single bucket below.
	const hits = [];
	for (const tx of transferTxs) {
		const counterName = tx.category.replace(/^\[|\]$/g, '');
		const selfName = tx.accountId ? tx.accountId.split(':')[2] : null;
		const counterMeta = accByName.get(counterName);
		if (!counterMeta || !selfName) continue;
		const counterAccountId = `account:${counterMeta.type}:${counterName}`;
		const expectedCategory = `[${selfName}]`;
		const tAmt = Number(tx.amount) || 0;
		const tSign = Math.sign(tAmt);
		const tAbs = Math.abs(tAmt);
		const candidates = transferTxs.filter(p => {
			const pAmt = Number(p.amount) || 0;
			return p._id !== tx._id
				&& p.accountId === counterAccountId
				&& p.category === expectedCategory
				&& p.date === tx.date
				&& Math.sign(pAmt) === -tSign
				&& Math.abs(pAmt) === tAbs;
		});
		if (candidates.length > 1) hits.push({ tx, candidates });
	}

	// Bucket by (date, sorted account pair). Same pair on same date is the
	// real "ambiguous cluster" — different |amount| under same pair are
	// just two collisions from the same cluster, not separate cases.
	const buckets = new Map();
	for (const h of hits) {
		const accPair = [h.tx.accountId, h.candidates[0].accountId].sort().join(' <-> ');
		const key = `${h.tx.date} | ${accPair}`;
		if (!buckets.has(key)) buckets.set(key, new Map());
		const bucket = buckets.get(key);
		bucket.set(h.tx._id, h.tx);
		h.candidates.forEach(c => bucket.set(c._id, c));
	}

	console.log(`Total ambiguous tx hits: ${hits.length}`);
	console.log(`Distinct collision clusters: ${buckets.size}\n`);

	// Pattern analysis — does the cluster have an even split of equal/opposite
	// amounts? That signals "same exact transfer entered twice".
	let exactDup = 0;
	let mixed = 0;
	for (const [, members] of buckets) {
		const arr = Array.from(members.values());
		const amounts = arr.map(t => t.amount).sort((a, b) => a - b);
		const positives = amounts.filter(a => a > 0).sort((a, b) => a - b);
		const negatives = amounts.filter(a => a < 0).map(a => -a).sort((a, b) => a - b);
		const samePattern = positives.length === negatives.length
			&& positives.every((v, i) => v === negatives[i]);
		if (samePattern && new Set(positives).size === 1) exactDup++;
		else mixed++;
	}
	console.log(`  - exact duplicate clusters (same amount × N): ${exactDup}`);
	console.log(`  - mixed-amount clusters: ${mixed}\n`);

	let groupIdx = 0;
	for (const [key, members] of buckets) {
		groupIdx++;
		const arr = Array.from(members.values()).sort((a, b) =>
			a.accountId.localeCompare(b.accountId) || (a.amount - b.amount)
		);
		const positives = arr.filter(t => t.amount > 0).map(t => t.amount);
		const negatives = arr.filter(t => t.amount < 0).map(t => -t.amount);
		const allSame = arr.every(t => Math.abs(t.amount) === Math.abs(arr[0].amount));
		const tag = allSame ? `EXACT-DUP × ${arr.length}` : 'MIXED';
		console.log(`────── [${groupIdx}] ${key}  (${arr.length} txs · ${tag}) ──────`);
		console.log(`  amounts: +[${positives.join(', ')}]  −[${negatives.join(', ')}]`);
		for (const t of arr) {
			const flags = [];
			if (t.transferId) flags.push(`tid=${t.transferId.slice(0, 8)}…`);
			if (t.currency) flags.push(`cur=${t.currency}`);
			const ext = `${t.payee || ''} ${t.memo ? '/' + t.memo : ''}`.trim();
			console.log(`  ${t._id.padEnd(70)} amt=${String(t.amount).padStart(12)}  ${ext}${flags.length ? '  [' + flags.join(',') + ']' : ''}`);
		}
		console.log('');
	}
};

main().catch(err => {
	console.error(err);
	process.exit(1);
});
