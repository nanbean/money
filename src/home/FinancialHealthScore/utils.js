import moment from 'moment';

// 통화 변환 헬퍼 — calcInvestmentScore, calcEmergencyScore, calcDebtScore 공통 사용
export const toDisplay = (acc, exchangeRate, currency) => {
	const accCurrency = acc.currency || 'KRW';
	return accCurrency !== currency
		? (currency === 'KRW' ? acc.balance * exchangeRate : acc.balance / exchangeRate)
		: acc.balance;
};

// [계좌명] 형식의 category는 내부 이체
export const isInternalTransfer = (t) => /^\[.*\]$/.test(t.category || '');

// 1. 저축률 — 최근 3개월(완성된 달 기준) 평균 저축률 (25점 만점)
//    당월은 부분 데이터이므로 제외하고, 직전 3개월 합산으로 계산
//    amount > 0 = 수입, amount < 0 = 지출
//    livingExpenseExempt 포함 카테고리는 지출에서 제외
export const calcSavingsScore = (transactions, livingExpenseExempt) => {
	const threeMonthsStart = moment().subtract(3, 'months').startOf('month').format('YYYY-MM-DD');
	const lastMonthEnd = moment().subtract(1, 'months').endOf('month').format('YYYY-MM-DD');
	const pastTxns = transactions.filter(t =>
		t.date >= threeMonthsStart && t.date <= lastMonthEnd
	);
	const income = pastTxns
		.filter(t => t.amount > 0 && !isInternalTransfer(t))
		.reduce((sum, t) => sum + t.amount, 0);
	const expense = pastTxns
		.filter(t => t.amount < 0 && !livingExpenseExempt.some(e => t.category?.startsWith(e)))
		.reduce((sum, t) => sum + Math.abs(t.amount), 0);

	if (income <= 0) return 0;
	const savingsRate = (income - expense) / income;
	if (savingsRate >= 0.2) return 25;
	if (savingsRate >= 0.1) return 15;
	if (savingsRate >= 0) return 8;
	return 0;
};

// 2. 투자 비중 — type === 'Invst' 계정 잔액 합 ÷ 전체 순자산 (25점 만점)
export const calcInvestmentScore = (accountList, exchangeRate, currency) => {
	const totalNetWorth = accountList
		.filter(a => !a.closed && !a.name.match(/_Cash/i))
		.reduce((sum, a) => sum + toDisplay(a, exchangeRate, currency), 0);

	const investmentTotal = accountList
		.filter(a => !a.closed && !a.name.match(/_Cash/i) && a.type === 'Invst')
		.reduce((sum, a) => sum + toDisplay(a, exchangeRate, currency), 0);

	if (totalNetWorth <= 0) return 0;
	const ratio = investmentTotal / totalNetWorth;
	if (ratio >= 0.3) return 25;
	if (ratio >= 0.2) return 18;
	if (ratio >= 0.1) return 10;
	return 5;
};

// 3. 비상금 — 유동자산(Bank + Cash만, CCard 제외) ÷ 최근 3개월 월평균 지출 (25점 만점)
export const calcEmergencyScore = (accountList, transactions, exchangeRate, currency) => {
	const liquidAssets = accountList
		.filter(a => !a.closed && (a.type === 'Bank' || a.type === 'Cash') && !a.name.match(/_Cash/i))
		.reduce((sum, a) => sum + toDisplay(a, exchangeRate, currency), 0);

	const accountMap = new Map(accountList.map(a => [a._id, a]));
	const toTxDisplay = (t) => {
		const acc = accountMap.get(t.accountId);
		const txCurrency = acc?.currency || 'KRW';
		const abs = Math.abs(t.amount);
		if (txCurrency === currency) return abs;
		return currency === 'KRW' ? abs * exchangeRate : abs / exchangeRate;
	};

	const threeMonthsAgo = moment().subtract(3, 'months').format('YYYY-MM-DD');
	const realExpenseTxns = transactions.filter(t =>
		t.date >= threeMonthsAgo &&
		t.amount < 0 &&
		!isInternalTransfer(t)
	);

	if (realExpenseTxns.length === 0) return 0;

	const monthsWithData = new Set(realExpenseTxns.map(t => t.date.slice(0, 7))).size;
	const totalExpense = realExpenseTxns.reduce((sum, t) => sum + toTxDisplay(t), 0);
	const monthlyAvg = totalExpense / monthsWithData;

	if (monthlyAvg <= 0) return 0;
	const months = liquidAssets / monthlyAvg;
	if (months >= 6) return 25;
	if (months >= 3) return 18;
	if (months >= 1) return 10;
	return 0;
};

// 4. 부채 비율 — type === 'Oth L' 절댓값 합 ÷ Oth L 제외 계좌 합 (25점 만점)
export const calcDebtScore = (accountList, exchangeRate, currency) => {
	const assetTotal = accountList
		.filter(a => !a.closed && !a.name.match(/_Cash/i) && a.type !== 'Oth L')
		.reduce((sum, a) => sum + toDisplay(a, exchangeRate, currency), 0);

	const debtTotal = accountList
		.filter(a => !a.closed && !a.name.match(/_Cash/i) && a.type === 'Oth L')
		.reduce((sum, a) => sum + Math.abs(toDisplay(a, exchangeRate, currency)), 0);

	if (assetTotal <= 0) return 0;
	const ratio = debtTotal / assetTotal;
	if (ratio < 0.2) return 25;
	if (ratio < 0.4) return 15;
	if (ratio < 0.6) return 8;
	return 0;
};

export const calcHealthScore = ({ transactions, accountList, livingExpenseExempt, exchangeRate, currency }) =>
	calcSavingsScore(transactions, livingExpenseExempt) +
	calcInvestmentScore(accountList, exchangeRate, currency) +
	calcEmergencyScore(accountList, transactions, exchangeRate, currency) +
	calcDebtScore(accountList, exchangeRate, currency);
