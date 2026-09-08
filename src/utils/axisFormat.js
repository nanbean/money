// 차트 축 눈금 라벨.
//
// 격자선은 1.5M·1.25M 처럼 반값·사분값에 놓이는 일이 흔하다 (Recharts 가
// 최댓값을 눈금 개수로 나눠 고른다). 소수점을 버리면 4.5M 이 '5M' 으로
// 찍혀서 라벨이 실제 격자선 값과 달라진다.
//
// 실측: Spending 월별 추이의 축이 0 · 1.5M · 3M · 4.5M · 6M 인데 화면에는
// 0 · 2M · 3M · 5M · 6M 으로 나왔다. 간격이 불규칙해 보이고, 4.82M 짜리
// 막대가 '5M' 선을 넘은 것처럼 읽혀 값을 잘못 읽게 만들었다.

// 나눈 값이 정수면 소수점을 떼고, 아니면 필요한 만큼만 남긴다.
// toFixed 뒤 Number 로 감싸면 1.50 → 1.5, 3.00 → 3 이 된다.
export const formatUnit = (value, divisor, suffix = '', maxFractionDigits = 2) => {
	const n = Number(value) / divisor;
	if (!Number.isFinite(n)) return '';
	return `${Number(n.toFixed(maxFractionDigits))}${suffix}`;
};

// 퍼센트 축. 12.5% 가 '13%' 로 찍히던 것과 같은 문제다.
export const formatPercentTick = (value, maxFractionDigits = 1) =>
	formatUnit(value, 1, '%', maxFractionDigits);
