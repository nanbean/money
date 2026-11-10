import { projectNetWorth, normalizeRates, DEFAULT_PROJECTION_RATES } from './netWorthProjection';

describe('projectNetWorth', () => {
	const jan1 = new Date(2026, 0, 1);

	test('연초면 한 해에 수익률과 저축을 한 번씩 더한다', () => {
		// 1월 1일이면 올해가 통째로 남아 있어 첫 줄(2027)은 두 해를 굴린 값이다.
		const out = projectNetWorth({ start: 100, annualSaving: 10, rates: [0, 10, 20], now: jan1, years: 2 });
		expect(out.map(r => r.year)).toEqual([2027, 2028]);
		expect(out[0].base).toBeCloseTo((100 * 1.1 + 10) * 1.1 + 10);
		expect(out[0].low).toBeCloseTo(120);
	});

	test('연말에 가까우면 올해 남은 기간만 굴린다', () => {
		const out = projectNetWorth({ start: 100, annualSaving: 0, rates: [0, 10, 20], now: new Date(2026, 11, 31, 23, 59), years: 1 });
		expect(out[0].base).toBeCloseTo(110, 1);
	});

	test('비관 ≤ 기본 ≤ 낙관', () => {
		const out = projectNetWorth({ start: 3e9, annualSaving: 1e8, rates: [8, 2, 5], now: jan1 });
		expect(out).toHaveLength(10);
		out.forEach(r => {
			expect(r.low).toBeLessThanOrEqual(r.base);
			expect(r.base).toBeLessThanOrEqual(r.high);
		});
	});

	test('순자산을 모르면 예측하지 않는다', () => {
		expect(projectNetWorth({ start: NaN, annualSaving: 1, rates: [1, 2, 3], now: jan1 })).toEqual([]);
	});
});

describe('normalizeRates', () => {
	test('깨진 설정은 기본값', () => {
		expect(normalizeRates(undefined)).toEqual(DEFAULT_PROJECTION_RATES);
		expect(normalizeRates([1, 'x', 3])).toEqual(DEFAULT_PROJECTION_RATES);
	});

	test('문자열 숫자도 받고 오름차순으로 맞춘다', () => {
		expect(normalizeRates(['7', 3, 5])).toEqual([3, 5, 7]);
	});
});
