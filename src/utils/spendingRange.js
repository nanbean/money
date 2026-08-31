// Spending 화면의 월 범위 계산.
//
// 'YYYY-MM' 문자열로만 다룬다 — 거래의 date 가 로컬 날짜 문자열이라 문자열 비교가
// 곧 월 비교가 된다. Date 객체로 비교하면 시간대 변환이 끼어든다.
//
// now 를 인자로 받는 이유는 테스트다. 예전에 이 계산이 toISOString() 을 써서 UTC
// 기준이 됐고, KST 에서는 매월 1일 오전 9시까지 지난달을 가리켰다.

// monthsBack 개월 전의 'YYYY-MM'. setDate(1) 을 먼저 해야 1/31 에서 setMonth 가
// 3월로 튀는 것을 막는다.
export const monthsAgoStr = (monthsBack, now = new Date()) => {
	const d = new Date(now.getTime());
	d.setDate(1);
	d.setMonth(d.getMonth() - monthsBack);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const thisMonthStr = (now = new Date()) => monthsAgoStr(0, now);

export const getStartMonthStr = (range, now = new Date()) => {
	switch (range) {
	case '1M': return monthsAgoStr(0, now);
	case '3M': return monthsAgoStr(2, now);
	case '6M': return monthsAgoStr(5, now);
	case 'YTD': return `${now.getFullYear()}-01`;
	case '1Y': return monthsAgoStr(12, now);
	default: return null;
	}
};

// 범위에 드는 달인지. 상한이 없던 동안 카드 결제 예정분 같은 미래 날짜 거래가
// '최근 1개월' 에 섞여 합계·Top payees·월별 차트를 모두 부풀렸다.
// 실측 — 8월 전기요금 93,770 이 9월 10일자 140,110 과 합쳐져 233,880 으로 나왔다.
export const isMonthInRange = (month, range, now = new Date()) => {
	if (!month) return false;
	const start = getStartMonthStr(range, now);
	if (start && month < start) return false;
	if (month > thisMonthStr(now)) return false;
	return true;
};
