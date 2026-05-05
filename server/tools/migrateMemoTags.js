// One-shot migration: normalize memo text and stamp derived fields
// (creditApplied / refund / refundAmount / giftTo / giftKind) on existing
// transactions in transactions_nanbean.
//
// Mirrors the client-side logic in src/utils/memoTags.js — kept inline here
// so this CommonJS tool doesn't depend on the client's ES-module bundle.
//
// Usage:
//   node server/tools/migrateMemoTags.js                    # dry-run, dev
//   node server/tools/migrateMemoTags.js --apply            # apply, dev
//   NODE_ENV=production node server/tools/migrateMemoTags.js [--apply]
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production';
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile) });

const config = require('../config');

const APPLY = process.argv.includes('--apply');
const SAMPLE_LIMIT = 10;
const BATCH = 500;
const DERIVED_KEYS = ['creditApplied', 'refund', 'refundAmount', 'giftTo', 'giftKind'];

const TAG_REGEXES = [
	{ id: 'credit', regex: /\bcredit\s*[:：]\s*([0-9]+(?:\.[0-9]+)?)/gi, canonical: (_m, v) => `credit:${v}` },
	{ id: 'refund', regex: /\brefund(?:\s*[:：]\s*([0-9]+(?:\.[0-9]+)?))?\b/gi, canonical: (_m, v) => (v ? `refund:${v}` : 'refund') },
	{ id: 'gift', regex: /\bgift\s*[:：]\s*([^\s,;]+)/gi, canonical: (_m, v) => `gift:${v}` },
	{ id: 'allowance', regex: /\ballowance\s*[:：]\s*([^\s,;]+)/gi, canonical: (_m, v) => `allowance:${v}` },
	{ id: 'support', regex: /\bsupport\s*[:：]\s*([^\s,;]+)/gi, canonical: (_m, v) => `support:${v}` }
];

const normalizeMemo = (memo) => {
	if (!memo || typeof memo !== 'string') return memo;
	let result = memo;
	for (const { regex, canonical } of TAG_REGEXES) {
		const re = new RegExp(regex.source, regex.flags);
		result = result.replace(re, canonical);
	}
	return result;
};

const deriveMemoFields = (memo) => {
	if (!memo || typeof memo !== 'string') return {};
	const out = {};
	const credit = memo.match(/\bcredit\s*[:：]\s*([0-9]+(?:\.[0-9]+)?)/i);
	if (credit) out.creditApplied = Number(credit[1]);
	const refund = memo.match(/\brefund(?:\s*[:：]\s*([0-9]+(?:\.[0-9]+)?))?\b/i);
	if (refund) {
		out.refund = true;
		if (refund[1]) out.refundAmount = Number(refund[1]);
	}
	const gift = memo.match(/\bgift\s*[:：]\s*([^\s,;]+)/i);
	if (gift) { out.giftTo = gift[1]; out.giftKind = 'gift'; }
	const allowance = memo.match(/\ballowance\s*[:：]\s*([^\s,;]+)/i);
	if (allowance) { out.giftTo = allowance[1]; out.giftKind = 'allowance'; }
	const support = memo.match(/\bsupport\s*[:：]\s*([^\s,;]+)/i);
	if (support) { out.giftTo = support[1]; out.giftKind = 'support'; }
	return out;
};

const pickDerived = (tx) => {
	const out = {};
	for (const k of DERIVED_KEYS) if (tx[k] !== undefined) out[k] = tx[k];
	return out;
};

const main = async () => {
	if (!config.couchDBAdminId || !config.couchDBAdminPassword || !config.couchDBUrl) {
		console.error('Missing CouchDB credentials in env. Aborting.');
		process.exit(1);
	}
	const nanoUrl = `https://${encodeURIComponent(config.couchDBAdminId)}:${encodeURIComponent(config.couchDBAdminPassword)}@${config.couchDBUrl}`;
	const nano = require('nano')(nanoUrl);
	const txDB = nano.use('transactions_nanbean');

	console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}  |  Env: ${envFile}  |  Host: ${config.couchDBUrl}\n`);

	const txResp = await txDB.list({ include_docs: true });
	const allTransactions = txResp.rows.map(r => r.doc).filter(d => d && !d._id.startsWith('_'));
	console.log(`Loaded ${allTransactions.length} transactions.\n`);

	let countWithMemo = 0;
	let countWithKeyword = 0;
	let countMemoChanged = 0;
	let countDerivedChanged = 0;
	const tagCounts = { credit: 0, refund: 0, gift: 0, allowance: 0, support: 0 };
	const updateMap = new Map();
	const samplesMemo = [];
	const samplesDerive = [];

	for (const tx of allTransactions) {
		if (!tx.memo || typeof tx.memo !== 'string' || tx.memo.length === 0) continue;
		countWithMemo++;

		const oldMemo = tx.memo;
		const newMemo = normalizeMemo(oldMemo);
		const derived = deriveMemoFields(newMemo);
		const hasKeyword = Object.keys(derived).length > 0;
		if (hasKeyword) countWithKeyword++;

		// Per-tag tally — count what would be derived (not raw memo occurrences).
		if (derived.creditApplied !== undefined) tagCounts.credit++;
		if (derived.refund) tagCounts.refund++;
		if (derived.giftKind === 'gift') tagCounts.gift++;
		if (derived.giftKind === 'allowance') tagCounts.allowance++;
		if (derived.giftKind === 'support') tagCounts.support++;

		const memoChanged = oldMemo !== newMemo;
		const existingDerived = pickDerived(tx);
		const derivedChanged = JSON.stringify(existingDerived) !== JSON.stringify(derived);

		if (memoChanged) {
			countMemoChanged++;
			if (samplesMemo.length < SAMPLE_LIMIT) samplesMemo.push({ id: tx._id, old: oldMemo, new: newMemo });
		}
		if (derivedChanged) {
			countDerivedChanged++;
			if (samplesDerive.length < SAMPLE_LIMIT) samplesDerive.push({ id: tx._id, memo: newMemo, derived });
		}

		if (memoChanged || derivedChanged) {
			const updated = { ...tx, memo: newMemo };
			for (const k of DERIVED_KEYS) delete updated[k];
			Object.assign(updated, derived);
			updateMap.set(tx._id, updated);
		}
	}

	console.log(`Transactions with memo:           ${countWithMemo}`);
	console.log(`Transactions with keyword match:  ${countWithKeyword}`);
	console.log(`Memo text would be normalized:    ${countMemoChanged}`);
	console.log(`Derived fields added/changed:     ${countDerivedChanged}`);
	console.log(`Total docs to update:             ${updateMap.size}\n`);

	console.log('Per-tag count (derived):');
	for (const [tag, n] of Object.entries(tagCounts)) console.log(`  ${tag.padEnd(14)} ${n}`);
	console.log('');

	if (samplesMemo.length > 0) {
		console.log('Sample memo text normalizations:');
		samplesMemo.forEach(s => {
			console.log(`  ${s.id}`);
			console.log(`    old: ${JSON.stringify(s.old)}`);
			console.log(`    new: ${JSON.stringify(s.new)}`);
		});
		console.log('');
	}
	if (samplesDerive.length > 0) {
		console.log('Sample derived-field stamps:');
		samplesDerive.forEach(s => {
			console.log(`  ${s.id}`);
			console.log(`    memo: ${JSON.stringify(s.memo).slice(0, 80)}`);
			console.log(`    →    ${JSON.stringify(s.derived)}`);
		});
		console.log('');
	}

	if (!APPLY) {
		console.log('Dry-run only. Re-run with --apply to commit changes.');
		return;
	}
	if (updateMap.size === 0) {
		console.log('Nothing to apply.');
		return;
	}

	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	const answer = await new Promise((resolve) => {
		rl.question(`Apply ${updateMap.size} updates to transactions_nanbean? (y/N): `, (a) => {
			rl.close();
			resolve(String(a).trim().toLowerCase());
		});
	});
	if (answer !== 'y' && answer !== 'yes') {
		console.log('Aborted.');
		return;
	}

	const docs = Array.from(updateMap.values());
	let totalErrors = 0;
	for (let i = 0; i < docs.length; i += BATCH) {
		const slice = docs.slice(i, i + BATCH);
		const result = await txDB.bulk({ docs: slice });
		const errors = result.filter(r => r.error);
		totalErrors += errors.length;
		console.log(`  Batch ${Math.floor(i / BATCH) + 1}: ${slice.length} docs, ${errors.length} errors`);
		if (errors.length > 0) errors.slice(0, 3).forEach(e => console.log('    error:', JSON.stringify(e)));
	}
	console.log(`\nDone. ${docs.length - totalErrors} updated, ${totalErrors} errors.`);
};

main().catch(err => {
	console.error('Migration failed:', err);
	process.exit(1);
});
