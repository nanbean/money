// One-shot migration: stamp `currency` and `transferId` on existing
// transaction docs in `transactions_nanbean`.
//
// Policy decisions (see chat thread):
//   - currency: read from accountList; KRW fallback when account missing.
//   - transferId: heuristic pair match (date + counter accountId + opposite-
//     sign amount, exactly one candidate). Mint new uuid for both halves
//     when both empty; propagate when only one side has it. Ambiguous and
//     orphan cases are reported and skipped.
//   - fxRate: NOT stamped retroactively (option A) — past FX is unknown.
//
// Usage:
//   node server/tools/migrateTransactions.js                    # dry-run, dev env
//   node server/tools/migrateTransactions.js --apply            # apply, dev env
//   NODE_ENV=production node server/tools/migrateTransactions.js [--apply]
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');
const { v1: uuidv1 } = require('uuid');

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production';
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile) });

const config = require('../config');

const APPLY = process.argv.includes('--apply');
const SAMPLE_LIMIT = 5;
const BATCH = 500;

const isInternalTransferCategory = (cat) => !!cat && /^\[.*\]$/.test(cat);

const main = async () => {
	if (!config.couchDBAdminId || !config.couchDBAdminPassword || !config.couchDBUrl) {
		console.error('Missing CouchDB credentials in env. Aborting.');
		process.exit(1);
	}
	const nanoUrl = `https://${encodeURIComponent(config.couchDBAdminId)}:${encodeURIComponent(config.couchDBAdminPassword)}@${config.couchDBUrl}`;
	const nano = require('nano')(nanoUrl);
	const txDB = nano.use('transactions_nanbean');
	const accDB = nano.use('accounts_nanbean');

	console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}  |  Env: ${envFile}  |  Host: ${config.couchDBUrl}\n`);

	const [txResp, accResp] = await Promise.all([
		txDB.list({ include_docs: true }),
		accDB.list({ include_docs: true })
	]);

	const allTransactions = txResp.rows
		.map(r => r.doc)
		.filter(d => d && !d._id.startsWith('_'));
	const accountList = accResp.rows
		.map(r => r.doc)
		.filter(d => d && !d._id.startsWith('_'));

	console.log(`Loaded ${allTransactions.length} transactions, ${accountList.length} accounts.\n`);

	const accById = new Map(accountList.map(a => [a._id, a]));
	const accByName = new Map(accountList.map(a => [a.name, a]));

	// ===== currency stamp =====
	const currencyStats = { toStamp: 0, alreadyStamped: 0, skippedNoAcct: 0 };
	const noAcctSamples = [];
	const currencyByTxId = new Map();

	for (const tx of allTransactions) {
		if (tx.currency) {
			currencyStats.alreadyStamped++;
			continue;
		}
		const acc = accById.get(tx.accountId);
		if (!acc) {
			currencyStats.skippedNoAcct++;
			if (noAcctSamples.length < SAMPLE_LIMIT) {
				noAcctSamples.push({ id: tx._id, accountId: tx.accountId });
			}
			continue;
		}
		currencyStats.toStamp++;
		currencyByTxId.set(tx._id, acc.currency || 'KRW');
	}

	// ===== transferId pairing =====
	const transferStats = {
		bothEmptyMint: 0,
		oneFilledPropagate: 0,
		alreadyPaired: 0,
		ambiguous: 0,
		orphan: 0,
		conflict: 0
	};
	const transferByTxId = new Map();
	const ambiguousSamples = [];
	const orphanSamples = [];
	const conflictSamples = [];

	const transferTxs = allTransactions.filter(t => isInternalTransferCategory(t.category));
	const visited = new Set();

	for (const tx of transferTxs) {
		if (visited.has(tx._id)) continue;

		const counterName = tx.category.replace(/^\[|\]$/g, '');
		const selfName = tx.accountId ? tx.accountId.split(':')[2] : null;
		const counterMeta = accByName.get(counterName);

		if (!counterMeta || !selfName) {
			transferStats.orphan++;
			if (orphanSamples.length < SAMPLE_LIMIT) {
				orphanSamples.push({
					id: tx._id, date: tx.date, accountId: tx.accountId,
					category: tx.category, reason: !counterMeta ? 'counter account missing' : 'no selfName'
				});
			}
			visited.add(tx._id);
			continue;
		}

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

		if (candidates.length === 0) {
			transferStats.orphan++;
			if (orphanSamples.length < SAMPLE_LIMIT) {
				orphanSamples.push({
					id: tx._id, date: tx.date, accountId: tx.accountId,
					category: tx.category, amount: tx.amount, reason: 'no counter candidate'
				});
			}
			visited.add(tx._id);
			continue;
		}

		if (candidates.length > 1) {
			transferStats.ambiguous++;
			if (ambiguousSamples.length < SAMPLE_LIMIT) {
				ambiguousSamples.push({
					id: tx._id, date: tx.date, accountId: tx.accountId,
					category: tx.category, amount: tx.amount,
					candidates: candidates.map(c => c._id)
				});
			}
			visited.add(tx._id);
			continue;
		}

		const pair = candidates[0];
		visited.add(tx._id);
		visited.add(pair._id);

		if (tx.transferId && pair.transferId) {
			if (tx.transferId === pair.transferId) {
				transferStats.alreadyPaired++;
			} else {
				transferStats.conflict++;
				if (conflictSamples.length < SAMPLE_LIMIT) {
					conflictSamples.push({
						a: tx._id, aTid: tx.transferId,
						b: pair._id, bTid: pair.transferId
					});
				}
			}
			continue;
		}

		if (tx.transferId || pair.transferId) {
			const sharedId = tx.transferId || pair.transferId;
			transferStats.oneFilledPropagate++;
			if (!tx.transferId) transferByTxId.set(tx._id, sharedId);
			if (!pair.transferId) transferByTxId.set(pair._id, sharedId);
			continue;
		}

		// Both empty — mint new id for the pair.
		const newId = uuidv1();
		transferStats.bothEmptyMint++;
		transferByTxId.set(tx._id, newId);
		transferByTxId.set(pair._id, newId);
	}

	// ===== Merge changes per doc =====
	const updateMap = new Map();
	for (const [id, currency] of currencyByTxId) {
		const tx = allTransactions.find(t => t._id === id);
		if (!tx) continue;
		updateMap.set(id, { ...tx, currency });
	}
	for (const [id, transferId] of transferByTxId) {
		const existing = updateMap.get(id);
		if (existing) {
			existing.transferId = transferId;
		} else {
			const tx = allTransactions.find(t => t._id === id);
			if (!tx) continue;
			updateMap.set(id, { ...tx, transferId });
		}
	}

	// ===== Report =====
	console.log('[currency]');
	console.log(`  to stamp:               ${currencyStats.toStamp}`);
	console.log(`  already stamped:        ${currencyStats.alreadyStamped}`);
	console.log(`  skipped (no account):   ${currencyStats.skippedNoAcct}`);
	if (noAcctSamples.length > 0) {
		console.log('  samples:');
		noAcctSamples.forEach(s => console.log('   ', JSON.stringify(s)));
	}
	console.log('');

	console.log('[transferId]');
	console.log(`  pairs, both empty (mint new):        ${transferStats.bothEmptyMint}`);
	console.log(`  pairs, one side filled (propagate):  ${transferStats.oneFilledPropagate}`);
	console.log(`  already paired (both same id):       ${transferStats.alreadyPaired}`);
	console.log(`  ambiguous (multiple candidates):     ${transferStats.ambiguous}`);
	console.log(`  orphan (no counter candidate):       ${transferStats.orphan}`);
	console.log(`  conflict (ids disagree):             ${transferStats.conflict}`);
	if (ambiguousSamples.length > 0) {
		console.log('\n  Sample ambiguous transfers:');
		ambiguousSamples.forEach(s => console.log('   ', JSON.stringify(s)));
	}
	if (orphanSamples.length > 0) {
		console.log('\n  Sample orphan transfers:');
		orphanSamples.forEach(s => console.log('   ', JSON.stringify(s)));
	}
	if (conflictSamples.length > 0) {
		console.log('\n  Sample conflicting transferIds:');
		conflictSamples.forEach(s => console.log('   ', JSON.stringify(s)));
	}
	console.log('');

	console.log(`Total docs to update: ${updateMap.size}`);
	console.log('(fxRate is NOT stamped retroactively — option A)\n');

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
			resolve(a.trim().toLowerCase());
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
		if (errors.length > 0) {
			errors.slice(0, 3).forEach(e => console.log('    error:', JSON.stringify(e)));
		}
	}
	console.log(`\nDone. ${docs.length - totalErrors} updated, ${totalErrors} errors.`);
};

main().catch(err => {
	console.error('Migration failed:', err);
	process.exit(1);
});
