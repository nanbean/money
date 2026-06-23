import moment from 'moment';
import { NON_EXPENSE_CATEGORY, NON_INCOME_CATEGORY } from '../../constants';

// 통화 변환 헬퍼 — calcInvestmentScore, calcEmergencyScore, calcDebtScore 공통 사용
export const toDisplay = (acc, exchangeRate, currency) => {
	const accCurrency = acc.currency || 'KRW';
	return accCurrency !== currency
		? (currency === 'KRW' ? acc.balance * exchangeRate : acc.balance / exchangeRate)
		: acc.balance;
};

// [계좌명] 형식의 category는 내부 이체
export const isInternalTransfer = (t) => /^\[.*\]$/.test(t.category || '');

// 저축률 income/expense 집계에 포함할 계좌 타입 — 투자(Invst)·부채(Oth L) 등은 제외
// (주식 매수가 expense로, 매도가 income으로 잡혀 cash flow 왜곡되는 문제 방지)
const CASH_ACCOUNT_TYPES = ['Bank', 'CCard', 'Cash'];

// 1. 저축률 — 최근 3개월(완성된 달 기준) 평균 저축률 (25점 만점)
//    당월은 부분 데이터이므로 제외하고, 직전 3개월 합산으로 계산
//    income/expense는 cash 계좌(Bank/CCard/Cash) 한정, 내부이체·NON_EXPENSE_CATEGORY·
//    livingExpenseExempt 카테고리 제외, USD 거래는 표시 통화로 환산.
//    income은 NON_INCOME_CATEGORY(차량 매각 등 자산→현금 유입)도 제외 — 일회성
//    자산 매각이 수입으로 잡혀 저축률이 왜곡되는 문제 방지(투자 매도 제외와 동일 취지).
export const calcSavingsBreakdown = (transactions, accountList, livingExpenseExempt, exchangeRate, currency) => {
	const accountMap = new Map((accountList || []).map(a => [a._id, a]));
	const accountType = (t) => t.accountId ? t.accountId.split(':')[1] : null;
	const toAmount = (t) => {
		const acc = accountMap.get(t.accountId);
		const txCur = acc?.currency || 'KRW';
		const amt = t.amount;
		if (txCur === currency) return amt;
		return currency === 'KRW' ? amt * exchangeRate : amt / exchangeRate;
	};

	const threeMonthsStart = moment().subtract(3, 'months').startOf('month').format('YYYY-MM-DD');
	const lastMonthEnd = moment().subtract(1, 'months').endOf('month').format('YYYY-MM-DD');
	const pastTxns = transactions.filter(t =>
		t.date >= threeMonthsStart && t.date <= lastMonthEnd
		&& CASH_ACCOUNT_TYPES.includes(accountType(t))
		&& !isInternalTransfer(t)
		&& t.category !== NON_EXPENSE_CATEGORY
	);

	const income = pastTxns
		.filter(t => t.amount > 0 && t.category !== NON_INCOME_CATEGORY)
		.reduce((sum, t) => sum + toAmount(t), 0);
	const expense = pastTxns
		.filter(t => t.amount < 0 && !livingExpenseExempt.some(e => t.category?.startsWith(e)))
		.reduce((sum, t) => sum + Math.abs(toAmount(t)), 0);

	const savingsRate = income > 0 ? (income - expense) / income : 0;
	return { income, expense, savingsRate };
};

export const calcSavingsScore = (transactions, accountList, livingExpenseExempt, exchangeRate, currency) => {
	const { income, savingsRate } = calcSavingsBreakdown(transactions, accountList, livingExpenseExempt, exchangeRate, currency);
	if (income <= 0) return 0;
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
	calcSavingsScore(transactions, accountList, livingExpenseExempt, exchangeRate, currency) +
	calcInvestmentScore(accountList, exchangeRate, currency) +
	calcEmergencyScore(accountList, transactions, exchangeRate, currency) +
	calcDebtScore(accountList, exchangeRate, currency);

// Shared grade mapping used by both Home hero badge and NetWorth detail panel
// so the same score never renders in two different colors.
export const healthGrade = (score) => {
	if (score >= 85) return { label: '최우수', color: '#10b981' };
	if (score >= 70) return { label: '좋음', color: '#10b981' };
	if (score >= 50) return { label: '보통', color: '#f59e0b' };
	if (score >= 30) return { label: '주의', color: '#f59e0b' };
	return { label: '위험', color: '#ef4444' };
};
