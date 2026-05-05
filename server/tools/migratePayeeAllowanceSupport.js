// One-shot: wrap the freeform memo of "용돈드림" / "용돈줌" payees into the
// proper memoTags keyword form so reporting can aggregate by giftKind.
//   payee=용돈드림 → memo "support:<memo>"
//   payee=용돈줌   → memo "allowance:<memo>"
//
// Skips:
//   - empty memo (target unknown — leave for manual review)
//   - memos that already carry any recognized keyword (idempotent)
//
// Usage:
//   node server/tools/migratePayeeAllowanceSupport.js                # dry-run
//   NODE_ENV=production node server/tools/migratePayeeAllowanceSupport.js --apply
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production';
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile) });

const config = require('../config');

const APPLY = process.argv.includes('--apply');
const SAMPLE_LIMIT = 15;
const BATCH = 500;
const DERIVED_KEYS = ['creditApplied', 'refund', 'refundAmount', 'giftTo', 'giftKind'];

// payee → keyword
const PAYEE_RULES = [
	{ payee: '용돈드림', keyword: 'support' },
	{ payee: '용돈줌', keyword: 'allowance' }
];

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

const main = async () => {
	if (!config.couchDBAdminId || !config.couchDBAdminPassword || !config.couchDBUrl) {
		console.error('Missing CouchDB credentials in env. Aborting.');
		process.exit(1);
	}
	const nanoUrl = `https://${encodeURIComponent(config.couchDBAdminId)}:${encodeURIComponent(config.couchDBAdminPassword)}@${config.couchDBUrl}`;
	const nano = require('nano')(nanoUrl);
	const txDB = nano.use('transactions_nanbean');

	console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}  |  Env: ${envFile}\n`);

	const txResp = await txDB.list({ include_docs: true });
	const all = txResp.rows.map(r => r.doc).filter(d => d && !d._id.startsWith('_'));

	const stats = {};
	const samples = [];
	const updateMap = new Map();

	for (const rule of PAYEE_RULES) {
		stats[rule.payee] = { matched: 0, alreadyTagged: 0, emptyMemo: 0, toWrap: 0 };
	}

	for (const tx of all) {
		const rule = PAYEE_RULES.find(r => r.payee === tx.payee);
		if (!rule) continue;
		const s = stats[rule.payee];
		s.matched++;

		if (!tx.memo || typeof tx.memo !== 'string' || tx.memo.trim().length === 0) {
			s.emptyMemo++;
			continue;
		}
		const existingDerived = deriveMemoFields(tx.memo);
		if (Object.keys(existingDerived).length > 0) {
			s.alreadyTagged++;
			continue;
		}

		const target = tx.memo.trim();
		const newMemo = `${rule.keyword}:${target}`;
		const derived = deriveMemoFields(newMemo);
		const updated = { ...tx, memo: newMemo };
		for (const k of DERIVED_KEYS) delete updated[k];
		Object.assign(updated, derived);
		updateMap.set(tx._id, updated);
		s.toWrap++;
		if (samples.length < SAMPLE_LIMIT) {
			samples.push({ id: tx._id, payee: tx.payee, old: tx.memo, new: newMemo, derived });
		}
	}

	for (const [payee, s] of Object.entries(stats)) {
		console.log(`Payee = "${payee}"`);
		console.log(`  matched       : ${s.matched}`);
		console.log(`  already tagged: ${s.alreadyTagged}`);
		console.log(`  empty memo    : ${s.emptyMemo}`);
		console.log(`  to wrap       : ${s.toWrap}`);
		console.log('');
	}
	console.log(`Total docs to update: ${updateMap.size}\n`);

	if (samples.length > 0) {
		console.log('Sample transformations:');
		for (const s of samples) {
			console.log(`  ${s.id}`);
			console.log(`    payee   : ${s.payee}`);
			console.log(`    old memo: ${JSON.stringify(s.old)}`);
			console.log(`    new memo: ${JSON.stringify(s.new)}`);
			console.log(`    derived : ${JSON.stringify(s.derived)}`);
		}
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
