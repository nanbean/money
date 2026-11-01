import { monthElapsedRatio, projectMonthEnd, INFLATION_RATE } from './monthProjection';

describe('monthElapsedRatio', () => {
	test('달 시작은 0, 마지막 날 정오는 30.5/31', () => {
		expect(monthElapsedRatio(new Date(2026, 9, 1, 0, 0, 0))).toBe(0);
		expect(monthElapsedRatio(new Date(2026, 9, 31, 12, 0, 0))).toBeCloseTo(30.5 / 31, 10);
	});
});

describe('projectMonthEnd', () => {
	test('마지막 날 아침에도 남은 하루만큼 작년 지출을 더한다 (실적과 같아지지 않는다)', () => {
		const now = new Date(2026, 9, 31, 9, 0, 0); // 10/31 09:00 — 남은 비율 15/24 일 / 31일
		const p = projectMonthEnd(3000000, 3100000, now);
		expect(p).toBeGreaterThan(3000000);
		expect(p).toBe(Math.round(3000000 + (15 / 24 / 31) * 3100000 * INFLATION_RATE));
	});

	test('자정 직전에는 실적으로 수렴한다', () => {
		const p = projectMonthEnd(3000000, 3100000, new Date(2026, 9, 31, 23, 59, 59));
		expect(p - 3000000).toBeLessThan(5);
	});

	test('예전 식(가중치 × 현재 속도 + (1 − 가중치) × 작년)과 같은 값', () => {
		const now = new Date(2026, 9, 15, 0, 0, 0); // 14일 경과
		const actual = 1400000;
		const last = 3000000;
		const w = 14 / 31;
		const old = w * (actual / 14 * 31) + (1 - w) * last * INFLATION_RATE;
		expect(projectMonthEnd(actual, last, now)).toBe(Math.round(old));
	});
});
