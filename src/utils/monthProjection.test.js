import { monthElapsedRatio, projectMonthEnd, INFLATION_RATE, buildSpendProfile, profileElapsedRatio } from './monthProjection';

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

describe('buildSpendProfile / 패턴 기반 월말 예상', () => {
	const now = new Date(2026, 10, 3, 0, 0, 0); // 11/3 00:00 — 11/2 까지 지남
	const amountOf = (r) => r.amount;
	// 직전 달마다 1일에 40, 15일에 60 을 쓴 패턴.
	const rows = [];
	for (let k = 1; k <= 12; k++) {
		const d = new Date(2026, 10 - k, 1);
		const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		rows.push({ date: `${ym}-01`, amount: 40 }, { date: `${ym}-15`, amount: 60 });
	}

	test('그 날짜까지 쓴 비율의 평균', () => {
		const profile = buildSpendProfile(rows, amountOf, now);
		expect(profile[0]).toBe(0);
		expect(profile[1]).toBeCloseTo(0.4);
		expect(profile[14]).toBeCloseTo(0.4);
		expect(profile[15]).toBeCloseTo(1);
		expect(profile[31]).toBeCloseTo(1);
	});

	test('이번 달·13개월 전은 넣지 않는다', () => {
		const profile = buildSpendProfile([
			...rows,
			{ date: '2026-11-01', amount: 1000 },
			{ date: '2025-10-01', amount: 1000 }
		], amountOf, now);
		expect(profile[1]).toBeCloseTo(0.4);
	});

	test('데이터가 없으면 null', () => {
		expect(buildSpendProfile([], amountOf, now)).toBeNull();
	});

	test('월초 고정 지출을 이미 쓴 것으로 보고 남은 몫만 더한다', () => {
		const profile = buildSpendProfile(rows, amountOf, now);
		// 패턴상 2일까지 40% 를 썼으므로 남은 60% 만 더한다. 날짜 비율이면 2/30 만 지나 93% 를 더했다.
		expect(profileElapsedRatio(profile, now)).toBeCloseTo(0.4);
		expect(projectMonthEnd(400, 1000, now, profile)).toBe(Math.round(400 + 0.6 * 1000 * INFLATION_RATE));
	});

	test('마지막 날도 자정까지 서서히 수렴한다', () => {
		const profile = buildSpendProfile(rows, amountOf, now);
		const lastDayMorning = new Date(2026, 10, 30, 6, 0, 0);
		expect(profileElapsedRatio(profile, lastDayMorning)).toBeCloseTo(1);
		// 패턴상 15일 이후 지출이 없으면 마지막 날엔 남은 몫이 없다.
		const flat = buildSpendProfile(rows.map(r => ({ ...r, date: r.date.replace(/-15$/, '-30') })), amountOf, now);
		expect(profileElapsedRatio(flat, new Date(2026, 10, 30, 12, 0, 0))).toBeLessThan(1);
		expect(profileElapsedRatio(flat, new Date(2026, 10, 30, 23, 59, 59))).toBeGreaterThan(0.99);
	});
});
