// One-shot: wrap freeform memo of (payee=Gifting + category 가족:증여) txns
// into proper memoTags keyword form. Different from migratePayeeAllowanceSupport
// in that this one targets a (payee, category) pair instead of payee alone.
//
//   payee=Gifting + category startsWith 가족:증여 → memo "gift:<memo>"
//
// Usage:
//   node server/tools/migratePayeeGiftCategory.js                # dry-run
//   NODE_ENV=production node server/tools/migratePayeeGiftCategory.js --apply
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

const PAYEE = 'Gifting';
const CATEGORY = '가족';
const SUBCATEGORY = '증여';
const KEYWORD = 'gift';
const TYPO_FIX = { '김심': '김심은' };

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

	const matchPayee = all.filter(t => t.payee === PAYEE);
	const matchTarget = all.filter(t =>
		t.payee === PAYEE
		&& t.category === CATEGORY
		&& t.subcategory === SUBCATEGORY
	);

	console.log(`payee == "${PAYEE}"                                          : ${matchPayee.length}`);
	console.log(`payee + category="${CATEGORY}" + subcategory="${SUBCATEGORY}" : ${matchTarget.length}\n`);

	let alreadyTagged = 0;
	let emptyMemo = 0;
	let toWrap = 0;
	let typoFixed = 0;
	const updateMap = new Map();
	const samples = [];

	for (const tx of matchTarget) {
		if (!tx.memo || typeof tx.memo !== 'string' || tx.memo.trim().length === 0) {
			emptyMemo++;
			continue;
		}
		const existing = deriveMemoFields(tx.memo);
		if (Object.keys(existing).length > 0) {
			alreadyTagged++;
			continue;
		}
		let target = tx.memo.trim();
		const wasTypo = Object.prototype.hasOwnProperty.call(TYPO_FIX, target);
		if (wasTypo) {
			target = TYPO_FIX[target];
			typoFixed++;
		}
		const newMemo = `${KEYWORD}:${target}`;
		const derived = deriveMemoFields(newMemo);
		const updated = { ...tx, memo: newMemo };
		for (const k of DERIVED_KEYS) delete updated[k];
		Object.assign(updated, derived);
		updateMap.set(tx._id, updated);
		toWrap++;
		if (samples.length < SAMPLE_LIMIT) {
			samples.push({ id: tx._id, category: tx.category, sub: tx.subcategory, old: tx.memo, new: newMemo, derived, typoFixed: wasTypo });
		}
	}

	console.log(`already tagged: ${alreadyTagged}`);
	console.log(`empty memo    : ${emptyMemo}`);
	console.log(`to wrap       : ${toWrap}`);
	console.log(`typo fixed    : ${typoFixed}`);
	console.log(`Total docs to update: ${updateMap.size}\n`);

	if (samples.length > 0) {
		console.log('Sample transformations:');
		for (const s of samples) {
			console.log(`  ${s.id}  ${s.category}:${s.sub}${s.typoFixed ? ' [typo fixed]' : ''}`);
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
