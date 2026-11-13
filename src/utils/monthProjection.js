// 이번 달 지출의 월말 예상.
//
//   예상 = 지금까지 지출 + 남은 비율 × 작년 같은 달 지출 × 물가
//
// 예전 식 '가중치 × 현재 속도 + (1 − 가중치) × 작년' 은 가중치 × 현재 속도가
// (경과/일수) × (지출/경과 × 일수) = 지출 로 약분되어 위와 같다.
//
// 경과는 날짜가 아니라 실제 시각으로 센다. 날짜로 세면 오늘 하루를 다 지난 것으로
// 보아, 마지막 날 아침에 이미 남은 비율이 0 이 되어 예상이 실적과 같아졌다
// (그날 남은 지출과 늦게 들어오는 결제가 빠진다). 시각으로 세면 자정까지 서서히 수렴한다.
//
// '남은 비율' 은 날짜 비율이 아니라 지출 패턴으로 잡는다 (profile 을 넘길 때).
// 지출은 월초에 몰린다 — 보험·관리비·용돈 같은 고정 지출이 초에 나가서, 3일까지
// 한 달 지출의 평균 14% 를 쓴다(날짜 비율로는 10%). 날짜 비율로 남은 몫을 잡으면 이미
// 낸 고정 지출을 한 번 더 세어 월초 예상이 높았다 (2025-11~2026-10 백테스트: 3일 시점
// 평균 +5%, 패턴으로 잡으면 +2%, 15일 시점 +4% → 0%).

export const INFLATION_RATE = 1.025;

const DAY_MS = 24 * 60 * 60 * 1000;

// 이번 달에서 지난 비율 (0~1). now 는 Date.
export const monthElapsedRatio = (now = new Date()) => {
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	const ratio = (now - start) / (end - start);
	return Math.min(1, Math.max(0, ratio));
};

export const daysInMonthOf = (now = new Date()) => Math.round(
	(new Date(now.getFullYear(), now.getMonth() + 1, 1) - new Date(now.getFullYear(), now.getMonth(), 1)) / DAY_MS
);

const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;

/**
 * 지출 패턴: 직전 months 개월(이번 달 제외) 동안 '그 달 d일까지 쓴 비율' 의 평균.
 * profile[d] (d = 0..31), profile[0] = 0. 지출이 없는 달은 평균에서 뺀다.
 * 쓸 수 있는 달이 없으면 null (날짜 비율로 되돌아간다).
 *
 * @param {Array<{date}>} rows        지출 거래 (date 'YYYY-MM-DD')
 * @param {(row) => number} amountOf  지출 금액 (양수)
 */
export const buildSpendProfile = (rows, amountOf, now = new Date(), months = 12) => {
	const wanted = new Map();
	for (let k = 1; k <= months; k++) {
		const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
		wanted.set(monthKey(d.getFullYear(), d.getMonth()), { days: new Array(32).fill(0), n: daysInMonthOf(d) });
	}
	(rows || []).forEach((row) => {
		const date = String((row && row.date) || '');
		const slot = wanted.get(date.slice(0, 7));
		if (!slot) return;
		const day = parseInt(date.slice(8, 10), 10);
		if (day >= 1 && day <= 31) slot.days[day] += Number(amountOf(row)) || 0;
	});

	const curves = [];
	wanted.forEach(({ days, n }) => {
		const total = days.reduce((a, b) => a + b, 0);
		if (!(total > 0)) return;
		const curve = new Array(32).fill(0);
		let sum = 0;
		// 짧은 달은 말일 뒤를 1 로 채운다 (31일 기준으로 맞춘다).
		for (let d = 1; d <= 31; d++) {
			if (d <= n) sum += days[d];
			curve[d] = Math.min(1, Math.max(0, sum / total));
		}
		curves.push(curve);
	});
	if (curves.length === 0) return null;
	return Array.from({ length: 32 }, (_, d) => curves.reduce((a, c) => a + c[d], 0) / curves.length);
};

// 패턴상 지금까지 쓴 비율 (0~1). 오늘은 시각만큼 어제와 오늘 사이를 잇는다 —
// 그래야 마지막 날에도 자정까지 서서히 1 로 간다.
export const profileElapsedRatio = (profile, now = new Date()) => {
	const day = now.getDate();
	const n = daysInMonthOf(now);
	const start = new Date(now.getFullYear(), now.getMonth(), day);
	const todayRatio = Math.min(1, Math.max(0, (now - start) / DAY_MS));
	// 이번 달의 말일은 패턴의 31일(=1)로 맞춘다. 짧은 달 말일에 0.9 쯤에서 멈추지 않게.
	const at = (d) => (d >= n ? 1 : profile[d]);
	const ratio = at(day - 1) + (at(day) - at(day - 1)) * todayRatio;
	return Math.min(1, Math.max(0, ratio));
};

// 월말 예상 총액. lastYearSameMonth 는 작년 같은 달 지출(물가 반영 전).
// profile 이 있으면 지출 패턴으로, 없으면 날짜 비율로 남은 몫을 잡는다.
export const projectMonthEnd = (actual, lastYearSameMonth, now = new Date(), profile = null) => {
	const elapsed = profile ? profileElapsedRatio(profile, now) : monthElapsedRatio(now);
	return Math.round(actual + (1 - elapsed) * (lastYearSameMonth || 0) * INFLATION_RATE);
};
