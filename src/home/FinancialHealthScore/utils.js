import moment from 'moment';
import { NON_EXPENSE_CATEGORY, NON_INCOME_CATEGORY } from '../../constants';
import { makeIsInvestmentCash } from '../../utils/investmentCash';
import { flattenTransactionRows, fullCategoryOf, isInternalTransfer, isLivingExpenseExempt } from '../../utils/expense';

// 통화 변환 헬퍼 — calcInvestmentScore, calcEmergencyScore, calcDebtScore 공통 사용
export const toDisplay = (acc, exchangeRate, currency) => {
	const accCurrency = acc.currency || 'KRW';
	return accCurrency !== currency
		? (currency === 'KRW' ? acc.balance * exchangeRate : acc.balance / exchangeRate)
		: acc.balance;
};

// 1. 저축률 — 최근 3개월(완성된 달 기준) 평균 저축률 (25점 만점)
//    당월은 부분 데이터이므로 제외하고, 직전 3개월 합산으로 계산.
//
// 집계는 utils/expense 의 flattenTransactionRows 를 쓴다. 계좌 종류(Bank/CCard/
// Cash), 계좌 간 이체, 대출 원금, 투자현금 제외가 거기 모여 있다. 투자 계좌를
// 빼는 이유는 주식 매수가 지출로, 매도가 수입으로 잡혀 현금 흐름이 왜곡되기
// 때문이다.
//
// 예전에는 이 함수가 거래를 직접 훑었고 — 거래를 훑는 네 번째 사본이었다 —
// 그 사본에 결함이 둘 있었다. 실측 기준(2026-06~08)으로:
//
//   * livingExpenseExempt 를 t.category 접두어로만 비교했다. 거래는 category 와
//     subcategory 를 나눠 갖는데 면제 목록에는 '세금:소득세' 처럼 서브카테고리
//     까지 지정된 항목이 많아서, 그런 항목이 하나도 걸러지지 않았다 —
//     8건 ₩29,364,318 이 생활비로 잡혔다.
//   * 분할(division)을 펼치지 않고 부모 금액만 봤다 — 창 안에 분할 거래 6건
//     (항목 43개)이 있었다.
//
// 두 결함 탓에 저축률이 -33.7% 로 나와 점수가 0이었다. 바로잡으면 +42.1% 다.
//
// income 은 NON_INCOME_CATEGORY(차량 매각 등 자산→현금 유입)도 제외한다 —
// 일회성 자산 매각이 수입으로 잡혀 저축률이 왜곡되는 문제 방지.
export const calcSavingsBreakdown = (transactions, accountList, livingExpenseExempt, exchangeRate, currency) => {
	const accountMap = new Map((accountList || []).map(a => [a._id, a]));
	const toAmount = (row) => {
		const acc = accountMap.get(row.accountId);
		const txCur = acc?.currency || 'KRW';
		if (txCur === currency) return row.amount;
		return currency === 'KRW' ? row.amount * exchangeRate : row.amount / exchangeRate;
	};

	const threeMonthsStart = moment().subtract(3, 'months').startOf('month').format('YYYY-MM-DD');
	const lastMonthEnd = moment().subtract(1, 'months').endOf('month').format('YYYY-MM-DD');

	// 분할 항목은 부모의 date 를 물려받으므로 펼치기 전에 창을 잘라도 결과가 같다.
	const inWindow = (transactions || [])
		.filter(t => t && t.date >= threeMonthsStart && t.date <= lastMonthEnd);
	const rows = flattenTransactionRows(inWindow)
		.filter(row => fullCategoryOf(row) !== NON_EXPENSE_CATEGORY);

	const income = rows
		.filter(row => row.amount > 0 && fullCategoryOf(row) !== NON_INCOME_CATEGORY)
		.reduce((sum, row) => sum + toAmount(row), 0);
	const expense = rows
		.filter(row => row.amount < 0 && !isLivingExpenseExempt(row, livingExpenseExempt))
		.reduce((sum, row) => sum + Math.abs(toAmount(row)), 0);

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
	const isInvCash = makeIsInvestmentCash(accountList);

	const totalNetWorth = accountList
		.filter(a => !a.closed && !isInvCash(a))
		.reduce((sum, a) => sum + toDisplay(a, exchangeRate, currency), 0);

	const investmentTotal = accountList
		.filter(a => !a.closed && !isInvCash(a) && a.type === 'Invst')
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
	const isInvCash = makeIsInvestmentCash(accountList);

	const liquidAssets = accountList
		.filter(a => !a.closed && (a.type === 'Bank' || a.type === 'Cash') && !isInvCash(a))
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
	const isInvCash = makeIsInvestmentCash(accountList);

	const assetTotal = accountList
		.filter(a => !a.closed && !isInvCash(a) && a.type !== 'Oth L')
		.reduce((sum, a) => sum + toDisplay(a, exchangeRate, currency), 0);

	const debtTotal = accountList
		.filter(a => !a.closed && !isInvCash(a) && a.type === 'Oth L')
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
