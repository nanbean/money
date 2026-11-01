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

// 월말 예상 총액. lastYearSameMonth 는 작년 같은 달 지출(물가 반영 전).
export const projectMonthEnd = (actual, lastYearSameMonth, now = new Date()) => {
	const remaining = 1 - monthElapsedRatio(now);
	return Math.round(actual + remaining * (lastYearSameMonth || 0) * INFLATION_RATE);
};
