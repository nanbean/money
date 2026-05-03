// Read-only portfolio analysis. Pulls accounts/investments + benchmark
// timeseries straight from CouchDB and prints a snapshot suitable for the
// chat thread. Uses portfolio manager memory conventions.
const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production';
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile) });

const config = require('../config');
const nano = require('nano')(`https://${encodeURIComponent(config.couchDBAdminId)}:${encodeURIComponent(config.couchDBAdminPassword)}@${config.couchDBUrl}`);

const accDB = nano.use('accounts_nanbean');
const settingsDB = nano.use('settings_nanbean');
const reportsDB = nano.use('reports_nanbean');
const historiesDB = nano.use('histories_nanbean');

const fmtKRW = (n) => '₩' + Math.round(n).toLocaleString();
const pct = (n) => `${(n * 100).toFixed(2)}%`;
const sign = (n) => (n >= 0 ? '+' : '');

(async () => {
	const [accResp, settingsResp, netWorthDoc, spyDoc] = await Promise.all([
		accDB.list({ include_docs: true }),
		settingsDB.list({ include_docs: true }),
		reportsDB.get('netWorth').catch(() => null),
		historiesDB.get('benchmark:SPY').catch(() => null)
	]);

	const accounts = accResp.rows.map(r => r.doc).filter(d => d && !d._id.startsWith('_'));
	const settings = settingsResp.rows.map(r => r.doc).filter(d => d && !d._id.startsWith('_'))
		.find(d => d._id === 'settings' || d._id === 'general' || d.exchangeRate) || {};
	const exchangeRate = Number(settings.exchangeRate) || 1300;

	const accById = new Map(accounts.map(a => [a._id, a]));
	const invstAccounts = accounts.filter(a => a.type === 'Invst');

	// ---------- holdings (aggregate by symbol across accounts) ----------
	const byName = new Map();
	for (const acc of invstAccounts) {
		for (const inv of (acc.investments || [])) {
			if (!inv.name) continue;
			const cur = acc.currency || 'KRW';
			const key = `${inv.name}::${cur}`;
			if (!byName.has(key)) {
				byName.set(key, { name: inv.name, currency: cur, quantity: 0, purchasedValue: 0, appraisedValue: 0, accounts: [] });
			}
			const a = byName.get(key);
			a.quantity += Number(inv.quantity) || 0;
			a.purchasedValue += Number(inv.purchasedValue) || 0;
			a.appraisedValue += Number(inv.appraisedValue) || 0;
			a.accounts.push(acc.name);
		}
	}
	const holdings = Array.from(byName.values()).filter(h => h.quantity > 0);
	holdings.forEach(h => {
		h.appraisedKRW = h.currency === 'USD' ? h.appraisedValue * exchangeRate : h.appraisedValue;
		h.purchasedKRW = h.currency === 'USD' ? h.purchasedValue * exchangeRate : h.purchasedValue;
		h.profitKRW = h.appraisedKRW - h.purchasedKRW;
		h.return = h.purchasedKRW > 0 ? (h.profitKRW / h.purchasedKRW) : 0;
	});
	holdings.sort((a, b) => b.appraisedKRW - a.appraisedKRW);

	const totalEquity = holdings.reduce((s, h) => s + h.appraisedKRW, 0);
	const totalCost = holdings.reduce((s, h) => s + h.purchasedKRW, 0);
	const totalUnrealizedPL = totalEquity - totalCost;

	// ---------- cash inside Invst accounts (_Cash linked) ----------
	const cashByCurrency = new Map();
	for (const acc of invstAccounts) {
		const cashAccId = acc.cashAccountId;
		if (!cashAccId) continue;
		const cashAcc = accById.get(cashAccId);
		if (!cashAcc) continue;
		const cur = cashAcc.currency || 'KRW';
		const bal = Number(cashAcc.cashBalance ?? cashAcc.balance) || 0;
		cashByCurrency.set(cur, (cashByCurrency.get(cur) || 0) + bal);
	}
	let totalCashKRW = 0;
	for (const [cur, bal] of cashByCurrency) {
		totalCashKRW += cur === 'USD' ? bal * exchangeRate : bal;
	}

	const totalInvestmentNetWorth = totalEquity + totalCashKRW;

	// ---------- currency allocation ----------
	const eqByCur = new Map();
	holdings.forEach(h => eqByCur.set(h.currency, (eqByCur.get(h.currency) || 0) + h.appraisedKRW));
	const krwExposure = (eqByCur.get('KRW') || 0) + (cashByCurrency.get('KRW') || 0);
	const usdExposure = (eqByCur.get('USD') || 0) + (cashByCurrency.get('USD') || 0) * exchangeRate;
	const totalExposure = krwExposure + usdExposure;

	// ---------- concentration ----------
	const weights = totalEquity > 0 ? holdings.map(h => h.appraisedKRW / totalEquity) : [];
	const hhi = weights.reduce((s, w) => s + w * w, 0);
	const top1 = weights[0] || 0;
	const top5 = weights.slice(0, 5).reduce((s, w) => s + w, 0);
	const top10 = weights.slice(0, 10).reduce((s, w) => s + w, 0);

	// ---------- benchmark comparison ----------
	let benchmark = null;
	const netWorthArr = (netWorthDoc && netWorthDoc.data) || [];
	const spyArr = (spyDoc && spyDoc.data) || [];
	if (netWorthArr.length >= 2 && spyArr.length >= 2) {
		const spyByMonth = new Map();
		spyArr.forEach(e => spyByMonth.set(e.date.substring(0, 7), e.close));
		const portfolioWithSpy = netWorthArr.filter(d => spyByMonth.has(d.date.substring(0, 7)));
		if (portfolioWithSpy.length >= 2) {
			const start = portfolioWithSpy[0];
			const end = portfolioWithSpy[portfolioWithSpy.length - 1];
			const spyStart = spyByMonth.get(start.date.substring(0, 7));
			const spyEnd = spyByMonth.get(end.date.substring(0, 7));
			const portfolioRet = start.investmentsNetWorth ? (end.investmentsNetWorth - start.investmentsNetWorth) / start.investmentsNetWorth : 0;
			const spyRet = spyStart ? (spyEnd - spyStart) / spyStart : 0;
			const years = (new Date(end.date) - new Date(start.date)) / (365.25 * 24 * 60 * 60 * 1000);
			benchmark = {
				startDate: start.date,
				endDate: end.date,
				years,
				portfolioRet,
				spyRet,
				portfolioCagr: years > 0 ? Math.pow(1 + portfolioRet, 1 / years) - 1 : 0,
				spyCagr: years > 0 ? Math.pow(1 + spyRet, 1 / years) - 1 : 0,
				alpha: portfolioRet - spyRet
			};
		}
	}

	// ---------- 1Y / 5Y comparison helpers ----------
	const sliceCompare = (yearsBack) => {
		if (netWorthArr.length === 0 || spyArr.length === 0) return null;
		const spyByMonth = new Map();
		spyArr.forEach(e => spyByMonth.set(e.date.substring(0, 7), e.close));
		const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - yearsBack);
		const start = netWorthArr.find(d => new Date(d.date) >= cutoff && spyByMonth.has(d.date.substring(0, 7)));
		const end = netWorthArr[netWorthArr.length - 1];
		if (!start || !end || start === end) return null;
		const sStart = spyByMonth.get(start.date.substring(0, 7));
		const sEnd = spyByMonth.get(end.date.substring(0, 7));
		if (!sStart || !sEnd) return null;
		const pRet = (end.investmentsNetWorth - start.investmentsNetWorth) / start.investmentsNetWorth;
		const sRet = (sEnd - sStart) / sStart;
		return { startDate: start.date, endDate: end.date, portfolioRet: pRet, spyRet: sRet, alpha: pRet - sRet };
	};
	const oneY = sliceCompare(1);
	const threeY = sliceCompare(3);
	const fiveY = sliceCompare(5);

	// ---------- print ----------
	const line = (s = '') => console.log(s);

	line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	line('  Portfolio snapshot · ' + new Date().toISOString().slice(0, 10));
	line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	line(`Investment net worth      : ${fmtKRW(totalInvestmentNetWorth)}`);
	line(`  · Securities (equity)   : ${fmtKRW(totalEquity)}  (${pct(totalEquity / totalInvestmentNetWorth)})`);
	line(`  · Cash in Invst accts   : ${fmtKRW(totalCashKRW)}  (${pct(totalCashKRW / totalInvestmentNetWorth)})`);
	line(`Cost basis                : ${fmtKRW(totalCost)}`);
	line(`Unrealized P/L            : ${sign(totalUnrealizedPL)}${fmtKRW(totalUnrealizedPL)}  (${sign(totalUnrealizedPL / totalCost)}${pct(totalUnrealizedPL / totalCost)})`);
	line(`(FX KRW/USD used: ${exchangeRate})`);
	line('');

	line('Currency exposure (equity + cash, KRW-converted)');
	line(`  KRW : ${fmtKRW(krwExposure)}  (${pct(krwExposure / totalExposure)})`);
	line(`  USD : ${fmtKRW(usdExposure)}  (${pct(usdExposure / totalExposure)})`);
	line('');

	line('Concentration');
	line(`  HHI (across equities)    : ${(hhi * 10000).toFixed(0)}  (Herfindahl, 0~10,000; >2,500 = high)`);
	line(`  Top 1                    : ${pct(top1)}`);
	line(`  Top 5                    : ${pct(top5)}`);
	line(`  Top 10                   : ${pct(top10)}`);
	line('');

	line('Top holdings');
	line('  ' + 'name'.padEnd(28) + 'cur'.padEnd(5) + 'qty'.padStart(10) + 'value(KRW)'.padStart(18) + 'PnL'.padStart(16) + 'ret'.padStart(10) + '   weight');
	holdings.slice(0, 15).forEach(h => {
		const w = h.appraisedKRW / totalEquity;
		line('  '
			+ String(h.name).slice(0, 28).padEnd(28)
			+ h.currency.padEnd(5)
			+ h.quantity.toFixed(2).padStart(10)
			+ fmtKRW(h.appraisedKRW).padStart(18)
			+ (sign(h.profitKRW) + fmtKRW(Math.abs(h.profitKRW))).padStart(16)
			+ (sign(h.return) + pct(h.return)).padStart(10)
			+ '   ' + pct(w));
	});
	line('');

	if (benchmark) {
		line('Benchmark vs S&P 500 (SPY) — overlap window');
		line(`  Window               : ${benchmark.startDate} → ${benchmark.endDate}  (~${benchmark.years.toFixed(1)} yr)`);
		line(`  Portfolio total ret  : ${sign(benchmark.portfolioRet)}${pct(benchmark.portfolioRet)}    (CAGR ${sign(benchmark.portfolioCagr)}${pct(benchmark.portfolioCagr)})`);
		line(`  SPY total ret        : ${sign(benchmark.spyRet)}${pct(benchmark.spyRet)}    (CAGR ${sign(benchmark.spyCagr)}${pct(benchmark.spyCagr)})`);
		line(`  Alpha (gross)        : ${sign(benchmark.alpha)}${pct(benchmark.alpha)}`);
		line('');

		line('Trailing windows (gross simple return on month-anchored points)');
		const padL = (s, w) => String(s).padStart(w);
		const fmtRow = (label, r) => {
			if (!r) return `  ${label.padEnd(6)} (insufficient data)`;
			return `  ${label.padEnd(6)} portfolio ${padL(sign(r.portfolioRet) + pct(r.portfolioRet), 9)}  vs SPY ${padL(sign(r.spyRet) + pct(r.spyRet), 9)}  alpha ${sign(r.alpha)}${pct(r.alpha)}`;
		};
		line(fmtRow('1Y', oneY));
		line(fmtRow('3Y', threeY));
		line(fmtRow('5Y', fiveY));
	} else {
		line('Benchmark vs SPY — not available (insufficient overlapping data).');
	}
	line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
})().catch(err => {
	console.error('analyzePortfolio failed:', err);
	process.exit(1);
});
