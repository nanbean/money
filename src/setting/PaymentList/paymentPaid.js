import moment from 'moment';

// 정기지불이 이번 주기에 이미 나갔는지 판정한다.
//
// 규칙은 server/services/paymentService.js 의 isPaid 와 같아야 한다. 서버는
// 이 판정으로 '미납 N건' 푸시를 보내므로, 화면과 어긋나면 사용자가 이미
// 처리한 항목을 두고 알림이 계속 온다.
//
// 두 곳에 같은 규칙이 있는 건 클라이언트가 ESM, 서버가 CJS 라서다. 한쪽을
// 고치면 다른 쪽도 고쳐야 한다 — 양쪽 테스트에 같은 사례 표를 둔 이유다.

// 주기가 3개월이면 '지난 두 달 ~ 이번 달' 안에 하나만 있으면 납부로 본다.
export const paidWindow = (payment, now = moment()) => {
	const interval = Number(payment && payment.interval) || 1;
	return {
		start: moment(now).subtract(interval - 1, 'months').format('YYYY-MM'),
		end: moment(now).format('YYYY-MM')
	};
};

export const isPaymentPaid = (payment, transactions = [], now = moment()) => {
	if (!payment) return false;
	const { start, end } = paidWindow(payment, now);

	return (transactions || []).some((t) => {
		if (!t || !t.accountId) return false;
		// accountId 는 'account:Bank:급여계좌' 다. 정기지불은 계좌명만 들고 있다.
		const accountName = t.accountId.split(':')[2];
		if (payment.account !== accountName) return false;
		if (payment.payee !== t.payee) return false;
		if (payment.category !== t.category) return false;
		// 정기지불의 subcategory 는 빈 문자열인 경우가 많다. 그때는 안 따진다.
		if (payment.subcategory && payment.subcategory !== t.subcategory) return false;

		const paid = moment(t.date).format('YYYY-MM');
		return paid >= start && paid <= end;
	});
};

// 정기지불에서 거래 입력 폼을 채울 값을 만든다.
//
// 금액은 그대로 넣지만 추정치다 — 공과금·통신비는 매달 다르다. 그래서 바로
// 기록하지 않고 폼을 열어 고칠 수 있게 한다.
export const paymentTransactionDraft = (payment, now = moment()) => {
	if (!payment) return null;

	// 결제일을 이번 달에 대입한다. 31일 같은 값은 달 길이를 넘어가면 다음 달로
	// 밀리므로(moment().date(31) 이 2월이면 3월 3일이 된다) 말일로 자른다.
	const base = moment(now);
	const day = Number(payment.day) || 1;
	const date = base.clone().date(Math.min(day, base.daysInMonth()));

	return {
		isEdit: false,
		account: payment.account || '',
		accountId: payment.accountId || '',
		date: date.format('YYYY-MM-DD'),
		payee: payment.payee || '',
		// 폼은 'category:subcategory' 한 덩어리로 다룬다.
		category: payment.subcategory
			? `${payment.category}:${payment.subcategory}`
			: (payment.category || ''),
		amount: payment.amount,
		memo: payment.memo || ''
	};
};
