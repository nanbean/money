import { computePeriodReturns, xirr } from './periodReturnCalc';

// 연말 행을 만든다. rates[i] 는 year 의 수익률. 입출금 없이 평가액이 수익률대로 움직인다.
const makeChart = (startYear, startValue, rates) => {
	const rows = [{ date: `${startYear}-12-31`, netWorth: startValue, returnRate: null }];
	let v = startValue;
	rates.forEach((r, i) => {
		v = v * (1 + r);
		rows.push({ date: `${startYear + i + 1}-12-31`, netWorth: v, returnRate: r });
	});
	return rows;
};

const byKey = (list) => Object.fromEntries(list.map(p => [p.key, p]));

describe('xirr', () => {
	test('1년 뒤 10% 불어난 단순 투자', () => {
		const r = xirr([{ date: '2020-01-01', amount: -100 }, { date: '2021-01-01', amount: 110 }]);
		expect(r).toBeCloseTo(0.1, 2);
	});

	test('부호가 한쪽뿐이면 풀 수 없다', () => {
		expect(xirr([{ date: '2020-01-01', amount: -100 }, { date: '2021-01-01', amount: -10 }])).toBeNull();
	});
});

describe('computePeriodReturns', () => {
	const today = '2026-10-28';

	test('완결 연도만 연환산하고 올해는 YTD 로 따로 낸다', () => {
		// 2015 말 시작, 2016~2025 매년 +10%, 2026(진행 중) +5%
		const chart = makeChart(2015, 1000, [...Array(10).fill(0.1), 0.05]);
		const res = byKey(computePeriodReturns({ chartData: chart, today }));

		expect(res.ytd.twr).toBeCloseTo(0.05, 10);
		expect(res['1y'].twr).toBeCloseTo(0.1, 10);
		expect(res['10y'].twr).toBeCloseTo(0.1, 10);
		expect(res.all.twr).toBeCloseTo(0.1, 10);
		expect(res.all.span).toBe(10);
	});

	test('기간보다 데이터가 짧으면 null', () => {
		const chart = makeChart(2021, 1000, [0.1, 0.1, 0.1, 0.1, 0.1]); // 2022~2026
		const res = byKey(computePeriodReturns({ chartData: chart, today }));

		expect(res['3y'].twr).toBeCloseTo(0.1, 10);
		expect(res['5y'].twr).toBeNull(); // 완결 연도는 2022~2025 네 해뿐
		expect(res['10y'].twr).toBeNull();
		expect(res.all.span).toBe(4);
	});

	test('투자 시작 전 해(평가액 0)는 세지 않는다', () => {
		const chart = [
			{ date: '2019-12-31', netWorth: 0, returnRate: null },
			{ date: '2020-12-31', netWorth: 0, returnRate: null },
			...makeChart(2021, 1000, [0.2, -0.1, 0.1, 0.1, 0.1]).map((r, i) => (i === 0 ? { ...r, returnRate: null } : r))
		];
		const res = byKey(computePeriodReturns({ chartData: chart, today }));
		expect(res.all.span).toBe(4); // 2022~2025
		expect(res.all.twr).toBeCloseTo(Math.pow(1.2 * 0.9 * 1.1 * 1.1, 1 / 4) - 1, 10);
	});

	test('입출금이 없으면 XIRR 이 TWR 과 거의 같다', () => {
		const chart = makeChart(2020, 1000, [0.1, 0.1, 0.1, 0.1, 0.1, 0.03]);
		const res = byKey(computePeriodReturns({ chartData: chart, today }));
		expect(res['5y'].xirr).toBeCloseTo(0.1, 2);
	});

	test('S&P 500 은 같은 구간 종가로 연환산한다', () => {
		const chart = makeChart(2020, 1000, [0.1, 0.1, 0.1, 0.1, 0.1, 0.03]);
		const sp500 = [
			{ date: '2020-12-31', close: 100 },
			{ date: '2024-12-31', close: 140 },
			{ date: '2025-12-31', close: 161.051 },
			{ date: '2026-10-27', close: 177.1561 }
		];
		const res = byKey(computePeriodReturns({ chartData: chart, sp500, today }));
		expect(res['5y'].spx).toBeCloseTo(0.1, 6);
		expect(res['1y'].spx).toBeCloseTo(161.051 / 140 - 1, 6);
		expect(res.ytd.spx).toBeCloseTo(0.1, 6);
		expect(res['10y'].spx).toBeNull(); // 데이터 자체가 10년이 안 됨
	});
});
