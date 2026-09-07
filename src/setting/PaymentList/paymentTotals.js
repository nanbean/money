import { isInternalTransferCategory } from '../../utils/expense';

// 정기 지불의 월 환산과 비용/이체 분해.
//
// 히어로의 '−₩489만/month' 는 40% 가 IRP·연금저축 적립과 부채 상환이었다. 그 돈은
// 자산으로 옮겨가거나 부채를 줄이는 것이라 순자산을 깎지 않는데, 한 덩어리로
// 표시되면서 월 실질 비용을 ₩196만 부풀렸다.
//
// 이체 판정은 거래와 같은 규칙을 쓴다 — 카테고리가 '[계좌명]' 형태다.
// (utils/expense 의 isInternalTransferCategory)

export const isTransferPayment = (payment) =>
	isInternalTransferCategory(payment && payment.category);

// interval 은 '몇 개월마다' 다. 연간 보험료는 12 로 나눠야 월 부담이 된다.
export const monthlyAmountKrw = (payment, exchangeRate = 1) => {
	if (!payment) return 0;
	const interval = Number(payment.interval) || 1;
	const monthly = (Number(payment.amount) || 0) / interval;
	const rate = (typeof exchangeRate === 'number' && exchangeRate > 0) ? exchangeRate : 1;
	return payment.currency === 'USD' ? monthly * rate : monthly;
};

// 결제일 순으로 늘어놓는다.
//
// 다음 결제일(due)이 아니라 day 를 쓴다. due 는 오늘을 기준으로 계산하므로
// 이번 달이 지난 항목이 다음 달로 밀리고, 그러면 목록 순서가 매일 바뀐다.
// 설정 화면에서 찾던 항목이 어제와 다른 자리에 있으면 안 된다.
export const comparePaymentsByDay = (a, b) => {
	// day 가 없거나 숫자가 아니면 뒤로 보낸다. 값이 없는 항목이 1일과
	// 섞이면 목록이 날짜순으로 안 읽힌다.
	const dayOf = (p) => {
		const n = Number(p && p.day);
		return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER;
	};

	const diff = dayOf(a) - dayOf(b);
	if (diff !== 0) return diff;

	// 같은 날이면 이름으로 가른다. 안 그러면 필터를 바꿀 때마다 같은 날짜
	// 안의 순서가 저장 순서에 따라 달라 보인다.
	return String((a && a.payee) || '').localeCompare(String((b && b.payee) || ''), 'ko');
};

export const sortPaymentsByDay = (payments = []) =>
	[...(payments || [])].sort(comparePaymentsByDay);

// 활성 항목만 집계한다. 일시중지된 건은 지금 나가는 돈이 아니다.
export const splitPaymentTotals = (payments = [], exchangeRate = 1) => {
	const totals = { all: 0, expense: 0, transfer: 0 };

	(payments || []).forEach((p) => {
		if (!p || !p.valid) return;
		const krw = monthlyAmountKrw(p, exchangeRate);
		totals.all += krw;
		if (isTransferPayment(p)) totals.transfer += krw;
		else totals.expense += krw;
	});

	return totals;
};
