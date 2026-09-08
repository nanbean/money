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

// 원화 축. 값 표시(designTokens 의 fmtKRW)와 같은 만/억 단위를 쓴다.
//
// 축만 M/K 를 쓰면 한 차트 안에서 단위가 갈린다 — 실측: 툴팁이 '₩482만' 인데
// 눈금은 '4.5M' 이라 매번 환산해야 했다. 만 단위로 바꾸면 격자선이 반값에
// 놓여도 정수로 떨어진다 (1.5M → 150만).
//
// 통화 기호는 붙이지 않는다. 축 폭이 56px 이고 눈금마다 반복돼 읽는 데
// 도움이 되지 않는다. 부호는 fmtKRW 와 같은 U+2212 를 쓴다.
export const formatKrwTick = (value) => {
	const n = Number(value);
	if (!Number.isFinite(n)) return '';
	const sign = n < 0 ? '−' : '';
	const abs = Math.abs(n);
	if (abs >= 100000000) return `${sign}${formatUnit(abs, 100000000, '억')}`;
	if (abs >= 10000) return `${sign}${formatUnit(abs, 10000, '만')}`;
	return `${sign}${Math.round(abs).toLocaleString()}`;
};
