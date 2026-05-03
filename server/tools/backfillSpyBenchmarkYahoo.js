// One-shot fill of the SPY benchmark series from Yahoo Finance, for dates
// that fall outside KIS's reach (KIS only goes back to ~2007-08). Pulls the
// portfolio's earliest netWorth date by default — override with --from=YYYY-MM-DD.
//
// Usage:
//   node server/tools/backfillSpyBenchmarkYahoo.js               # auto-detect from netWorth
//   node server/tools/backfillSpyBenchmarkYahoo.js --from=2005-01-01
const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production';
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile) });

const fromArg = process.argv.find(a => a.startsWith('--from='));
const explicitFrom = fromArg ? fromArg.split('=')[1] : null;

const benchmarkService = require('../services/benchmarkService');
const reportDB = require('../db/reportDB');

const detectPortfolioStart = async () => {
	const doc = await reportDB.getReport('netWorth');
	const data = (doc && doc.data) || [];
	if (data.length === 0) return null;
	const first = data[0].date;
	if (!first || !/^\d{4}-\d{2}-\d{2}/.test(first)) return null;
	// netWorth points are normally month anchors (YYYY-MM-01); use as-is.
	return first.length >= 10 ? first.slice(0, 10) : first;
};

(async () => {
	try {
		let fromDate = explicitFrom;
		if (!fromDate) {
			console.log('[backfillSpy/yahoo] Auto-detecting portfolio start...');
			fromDate = await detectPortfolioStart();
			if (!fromDate) {
				console.error('[backfillSpy/yahoo] Could not detect portfolio start. Pass --from=YYYY-MM-DD.');
				process.exit(1);
			}
			console.log(`[backfillSpy/yahoo] Detected start: ${fromDate}`);
		}
		console.log(`[backfillSpy/yahoo] Filling Yahoo SPY history from ${fromDate} (env: ${envFile})`);
		const summary = await benchmarkService.backfillSp500FromYahoo(fromDate);
		console.log('[backfillSpy/yahoo] Done:', JSON.stringify(summary, null, 2));
		process.exit(0);
	} catch (err) {
		console.error('[backfillSpy/yahoo] Failed:', err);
		process.exit(1);
	}
})();
