// 순자산 예측: 다음 해 = 올해 × (1 + 수익률) + 연 저축액.
//
// 과거 순자산 CAGR 을 그대로 늘리지 않는다. 자산이 작던 때의 성장은 대부분 저축이라
// 비율로 늘리면 저축이 복리로 부풀려진다 (2015→2025 CAGR 31% 를 10년 늘리면 29.8억이
// 약 440억). 저축은 금액으로, 불확실성은 수익률 범위(비관·기본·낙관)로 나눠 본다.

export const DEFAULT_PROJECTION_RATES = [2, 5, 8]; // 연 %, 비관·기본·낙관

// 설정값이 비었거나 깨졌으면 기본값을 쓰고, 오름차순으로 맞춘다.
export const normalizeRates = (rates) => {
	const valid = Array.isArray(rates) && rates.length === 3 && rates.every(r => Number.isFinite(Number(r)));
	return (valid ? rates.map(Number) : DEFAULT_PROJECTION_RATES).slice().sort((a, b) => a - b);
};

/**
 * @param {object} p
 * @param {number} p.start          지금 순자산 (표시 통화)
 * @param {number} p.annualSaving   연 저축액 (표시 통화, 음수면 순유출)
 * @param {number[]} p.rates        연 % [비관, 기본, 낙관]
 * @param {Date} p.now              지금. 올해 남은 기간만큼 첫 해를 줄인다.
 * @param {number} [p.years=10]     몇 해 뒤까지
 * @returns {Array<{year, low, base, high}>}  올해 다음 해부터의 연말 예측
 */
export const projectNetWorth = ({ start, annualSaving, rates, now, years = 10 }) => {
	if (!Number.isFinite(start)) return [];
	const [low, base, high] = normalizeRates(rates);
	const saving = Number.isFinite(annualSaving) ? annualSaving : 0;
	const thisYear = now.getFullYear();
	// 올해 연말까지 남은 비율. 11월 10일이면 약 0.14.
	const yearEnd = new Date(thisYear + 1, 0, 1);
	const yearStart = new Date(thisYear, 0, 1);
	const remain = Math.max(0, (yearEnd - now) / (yearEnd - yearStart));

	// 올해 남은 기간을 먼저 굴려 연말 값을 만든 뒤 한 해씩 쌓는다.
	const step = (value, pct, t) => value * Math.pow(1 + pct / 100, t) + saving * t;
	let v = { low: step(start, low, remain), base: step(start, base, remain), high: step(start, high, remain) };

	const out = [];
	for (let k = 1; k <= years; k++) {
		v = { low: step(v.low, low, 1), base: step(v.base, base, 1), high: step(v.high, high, 1) };
		out.push({ year: thisYear + k, ...v });
	}
	return out;
};
