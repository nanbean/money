// One-shot backfill of the SPY (S&P 500) benchmark timeseries into
// historiesDB. Intended to be run once on the production host after the
// new benchmark service is deployed; thereafter the daily scheduler keeps
// it incremental.
//
// Usage:
//   node server/tools/backfillSpyBenchmark.js          # 5 year horizon
//   node server/tools/backfillSpyBenchmark.js --years=10
//
// Env: loads .env.development when NODE_ENV=development, .env.production
// otherwise (mirrors server/index.js convention).
const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production';
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile) });

const yearsArg = process.argv.find(a => a.startsWith('--years='));
const YEARS = yearsArg ? Number(yearsArg.split('=')[1]) : 5;

const benchmarkService = require('../services/benchmarkService');

(async () => {
	try {
		console.log(`[backfillSpy] Starting backfill — horizon ${YEARS} years (env: ${envFile})`);
		const summary = await benchmarkService.backfillSp500(YEARS);
		console.log('[backfillSpy] Done:', JSON.stringify(summary, null, 2));
		process.exit(0);
	} catch (err) {
		console.error('[backfillSpy] Failed:', err);
		process.exit(1);
	}
})();
