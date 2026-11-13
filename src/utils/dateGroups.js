// 거래 목록을 날짜 머리줄과 거래 줄이 섞인 한 줄 목록으로 편다 (가상 스크롤용).
// 목록은 이미 날짜순이라고 보고, 이웃한 같은 날짜끼리 묶는다.
//
// 거래 줄은 원래 목록의 index 를 그대로 들고 간다 — 편집 모달이 그 index 로
// 거래를 찾는다.

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// '2026-11-11' → '11월 11일 (수)'. 올해가 아니면 연도를 붙인다.
export const formatDayHeader = (date, now = new Date()) => {
	const [y, m, d] = String(date).slice(0, 10).split('-').map(Number);
	if (!y || !m || !d) return String(date || '');
	const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
	const head = `${m}월 ${d}일 (${weekday})`;
	return y === now.getFullYear() ? head : `${y}년 ${head}`;
};

/**
 * @param {Array} transactions        날짜순 거래
 * @param {(t) => string} currencyOf  거래의 통화. 하루 합계는 통화가 하나일 때만 낸다.
 * @returns {Array<{type: 'header', date, total, currency} | {type: 'row', index}>}
 */
export const buildDateGroups = (transactions = [], currencyOf = () => 'KRW') => {
	const items = [];
	let header = null;
	(transactions || []).forEach((t, index) => {
		const date = String((t && t.date) || '').slice(0, 10);
		if (!header || header.date !== date) {
			header = { type: 'header', date, total: 0, currency: currencyOf(t) };
			items.push(header);
		}
		if (header.currency !== null && header.currency !== currencyOf(t)) {
			// 통화가 섞인 날은 합계를 더할 수 없다.
			header.currency = null;
			header.total = null;
		}
		if (header.total !== null) header.total += Number(t && t.amount) || 0;
		items.push({ type: 'row', index });
	});
	return items;
};
