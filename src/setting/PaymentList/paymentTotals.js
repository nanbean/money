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
