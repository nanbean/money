// 기간별 수익률: 1·3·5·10년 / 전체 연환산 + 올해 YTD.
//
// 시간가중끼리, 금액가중끼리 비교하도록 넷을 나란히 본다.
//   twr     — 시간가중 수익률. 연도별 Modified Dietz(useReturnReport) 를 이어 붙여 연환산한다.
//             입출금 시점의 영향을 뺀 '운용 실력'.
//   spx     — 같은 구간의 S&P 500(SPY 종가) 연환산 (twr 과 비교). 가격 기준이라 배당은 빠져 있다.
//   xirr    — 금액가중 수익률. 같은 입출금을 날짜 그대로 넣어 푼다. 언제 얼마를 넣고
//             뺐는지까지 반영한 '체감 수익률'.
//   spxXirr — 같은 입출금을 SPY 에 했다면의 XIRR (PME, xirr 과 비교). xirr 을 spx 와 바로
//             비교하면 큰돈이 들어간 시기의 성과가 실력처럼 보인다.
//
// 연환산 구간은 완결된 연도만 쓴다. 진행 중인 올해를 한 해로 세면 연환산이 왜곡되므로
// 올해는 YTD(연환산하지 않은 누적) 로 따로 낸다.

export const PERIODS = [
	{ key: 'ytd', label: 'YTD', years: null },
	{ key: '1y', label: '1년', years: 1 },
	{ key: '3y', label: '3년', years: 3 },
	{ key: '5y', label: '5년', years: 5 },
	{ key: '10y', label: '10년', years: 10 },
	{ key: 'all', label: '전체', years: 'all' }
];

const DAY_MS = 24 * 60 * 60 * 1000;
const yearOf = (row) => parseInt(String(row.date).slice(0, 4), 10);
const yearEnd = (year) => `${year}-12-31`;
const isRate = (r) => typeof r === 'number' && Number.isFinite(r);

const annualize = (rates) => {
	if (rates.length === 0) return null;
	const growth = rates.reduce((acc, r) => acc * (1 + r), 1);
	if (growth <= 0) return -1;
	return Math.pow(growth, 1 / rates.length) - 1;
};

// 그해 수익률을 쓸 수 있는가: 전년 말 평가액이 있어야 Modified Dietz 분모가 의미 있다.
// 투자 시작 전 해는 0/0 = NaN → returnRate null 로 들어온다.
const usableYears = (chartData) => {
	const out = new Map();
	for (let i = 1; i < chartData.length; i++) {
		const prev = chartData[i - 1];
		const row = chartData[i];
		if (isRate(row.returnRate) && (prev.netWorth || 0) > 0) out.set(yearOf(row), row.returnRate);
	}
	return out;
};

// SPY 종가 시계열에서 그 날짜(포함) 이전의 마지막 종가. 시계열이 그 날짜를 덮지 못하면 null.
const closeAt = (series, date) => {
	if (!series.length || series[0].date > date) return null;
	let lo = 0;
	let hi = series.length - 1;
	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		if (series[mid].date <= date) lo = mid; else hi = mid - 1;
	}
	return series[lo].close;
};

const spxReturn = (series, startDate, endDate, years) => {
	const start = closeAt(series, startDate);
	const end = closeAt(series, endDate);
	if (!start || !end) return null;
	const total = end / start - 1;
	return years ? Math.pow(1 + total, 1 / years) - 1 : total;
};

// XIRR: Σ flow / (1+r)^(일수/365) = 0. 뉴턴법으로 풀고, 수렴하지 않으면 이분법.
export const xirr = (flows) => {
	const valid = flows.filter(f => f.amount && Number.isFinite(f.amount));
	if (valid.length < 2) return null;
	if (!valid.some(f => f.amount > 0) || !valid.some(f => f.amount < 0)) return null;
	const t0 = new Date(valid[0].date).getTime();
	const ts = valid.map(f => (new Date(f.date).getTime() - t0) / DAY_MS / 365);
	const npv = (r) => valid.reduce((s, f, i) => s + f.amount / Math.pow(1 + r, ts[i]), 0);
	const dnpv = (r) => valid.reduce((s, f, i) => s - ts[i] * f.amount / Math.pow(1 + r, ts[i] + 1), 0);

	let r = 0.1;
	for (let i = 0; i < 50; i++) {
		const v = npv(r);
		const d = dnpv(r);
		if (!Number.isFinite(v) || !Number.isFinite(d) || d === 0) break;
		const next = r - v / d;
		if (next <= -0.9999 || !Number.isFinite(next)) break;
		if (Math.abs(next - r) < 1e-9) return next;
		r = next;
	}

	let lo = -0.9999;
	let hi = 10;
	let flo = npv(lo);
	if (!Number.isFinite(flo) || flo * npv(hi) > 0) return null;
	for (let i = 0; i < 200; i++) {
		const mid = (lo + hi) / 2;
		const fm = npv(mid);
		if (Math.abs(fm) < 1e-7 || hi - lo < 1e-10) return mid;
		if (fm * flo < 0) hi = mid; else { lo = mid; flo = fm; }
	}
	return (lo + hi) / 2;
};

// 투자자 관점의 현금흐름: 시작 평가액을 넣고(-), 구간 중 입금은 -, 출금은 +, 끝 평가액을 받는다(+).
const xirrFor = (cashFlows, startDate, startValue, endDate, endValue) => {
	if (!(startValue > 0) && !cashFlows.some(f => f.date > startDate && f.date <= endDate)) return null;
	const flows = [{ date: startDate, amount: -(startValue || 0) }];
	cashFlows
		.filter(f => f.date > startDate && f.date <= endDate)
		.forEach(f => flows.push({ date: f.date, amount: -f.amount }));
	flows.push({ date: endDate, amount: endValue });
	return xirr(flows.filter(f => f.amount !== 0));
};

// S&P 500 XIRR (PME, 공개시장 등가): 같은 날 같은 금액을 SPY 에 넣고 뺐다면.
// 시작 평가액으로 SPY 를 사고, 입금일엔 그 금액만큼 더 사고 출금일엔 판다. 끝에 남은
// SPY 평가액을 받는 것으로 보고 푼다. 현금흐름이 내 XIRR 과 같으므로 두 값의 차이는
// '무엇에 투자했나'만 남는다. SPY 시계열이 구간을 덮지 못하면 null.
const spxXirrFor = (cashFlows, series, startDate, startValue, endDate) => {
	const startClose = closeAt(series, startDate);
	const endClose = closeAt(series, endDate);
	if (!startClose || !endClose) return null;
	let units = (startValue || 0) / startClose;
	const flows = [{ date: startDate, amount: -(startValue || 0) }];
	for (const f of cashFlows) {
		if (f.date <= startDate || f.date > endDate) continue;
		const close = closeAt(series, f.date);
		if (!close) return null;
		units += f.amount / close;
		flows.push({ date: f.date, amount: -f.amount });
	}
	flows.push({ date: endDate, amount: units * endClose });
	return xirr(flows.filter(f => f.amount !== 0));
};

/**
 * @param {object} p
 * @param {Array<{date, netWorth, returnRate}>} p.chartData  useReturnReport 의 연말 행 (오름차순)
 * @param {Array<{date, amount}>} p.cashFlows                포트폴리오 입출금(+입금 −출금, 표시 통화)
 * @param {Array<{date, close}>} p.sp500                     SPY 종가 (오름차순)
 * @param {string} p.today                                   'YYYY-MM-DD'
 */
export const computePeriodReturns = ({ chartData = [], cashFlows = [], sp500 = [], today }) => {
	if (chartData.length < 2) return [];
	const currentYear = parseInt(today.slice(0, 4), 10);
	const lastCompleted = currentYear - 1;
	const rates = usableYears(chartData);
	const rowByYear = new Map(chartData.map(r => [yearOf(r), r]));
	const valueAt = (year) => (rowByYear.get(year) || {}).netWorth || 0;
	const flows = [...cashFlows].sort((a, b) => (a.date < b.date ? -1 : 1));
	const completedYears = [...rates.keys()].filter(y => y <= lastCompleted).sort((a, b) => a - b);
	const firstYear = completedYears[0];

	return PERIODS.map((p) => {
		if (p.years === null) {
			const twr = rates.has(currentYear) ? rates.get(currentYear) : null;
			const startDate = yearEnd(currentYear - 1);
			return {
				...p,
				twr,
				spx: spxReturn(sp500, startDate, today, null),
				xirr: null, // 1년 미만은 연환산 금액가중 수익률이 과장되므로 내지 않는다
				spxXirr: null
			};
		}

		const span = p.years === 'all'
			? (firstYear ? lastCompleted - firstYear + 1 : 0)
			: p.years;
		const years = span > 0 ? Array.from({ length: span }, (_, i) => lastCompleted - span + 1 + i) : [];
		const complete = years.length > 0 && years.every(y => rates.has(y));
		if (!complete) return { ...p, span, twr: null, spx: null, xirr: null, spxXirr: null };

		const startYear = years[0] - 1;
		const startDate = yearEnd(startYear);
		const endDate = yearEnd(lastCompleted);
		return {
			...p,
			span,
			twr: annualize(years.map(y => rates.get(y))),
			spx: spxReturn(sp500, startDate, endDate, span),
			xirr: xirrFor(flows, startDate, valueAt(startYear), endDate, valueAt(lastCompleted)),
			spxXirr: spxXirrFor(flows, sp500, startDate, valueAt(startYear), endDate)
		};
	});
};
