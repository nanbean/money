import { isInvestmentCashAccountId } from './investmentCash';

// 지출 집계의 공통 전처리. Spending / HomeCashFlow / Reports>Expense 가 각자
// 거래를 훑고 있었고, 그중 분할(division) 처리가 갈려서 같은 달 합계가 어긋났다.
export const EXPENSE_ACCOUNT_TYPES = ['Bank', 'CCard', 'Cash'];

// 계좌 간 이체는 지출이 아니다. 카테고리가 '[계좌명]' 형태로 들어온다.
export const isInternalTransferCategory = (category) =>
	!!category && category.startsWith('[') && category.endsWith(']');

// 거래 단위 판정. 호출부는 대개 거래를 들고 있다.
//
// 예전에는 7개 파일이 각자 `/^\[.*\]$/.test(t.category || '')` 를 들고 있었다.
// 결과는 같지만(개행이 든 카테고리에서만 갈리고, 그런 이름은 없다) 규칙이
// 일곱 군데 흩어져 있으면 한 곳만 고쳐도 나머지가 남는다.
export const isInternalTransfer = (transaction) =>
	isInternalTransferCategory(transaction && transaction.category);

// accountId 는 'account:Type:Name' 형태다.
export const accountTypeOf = (tx) => (tx && tx.accountId ? tx.accountId.split(':')[1] : null);

export const fullCategoryOf = (tx) =>
	(tx && tx.subcategory ? `${tx.category}:${tx.subcategory}` : (tx ? tx.category : undefined));

// 거래 목록을 지출 행 목록으로 펼친다.
//
// 분할 거래는 하위 항목이 실제 지출이므로 각각을 한 행으로 낸다. 급여처럼 부모
// 금액이 양수(+)인 거래도 분할 안에는 급식비·통신비·회비 같은 지출이 들어 있어서,
// 부모 금액의 부호만 보고 걸러내면 그 지출이 통째로 누락된다.
//
// 여기서 걸러내는 것은 '현금 흐름의 정의' 에 해당하는 것만이다 — 계좌 종류,
// 계좌 간 이체, 대출 원금, 투자현금. 부호·'분류없음'·생활비 면제처럼 화면별로
// 다르게 보는 조건은 호출하는 쪽에서 판단한다.
export const flattenTransactionRows = (transactions = []) => {
	const rows = [];

	(transactions || []).forEach((tx) => {
		if (!tx) return;
		if (!EXPENSE_ACCOUNT_TYPES.includes(accountTypeOf(tx))) return;
		// 투자현금 계좌는 타입이 Bank 라 위 검사를 통과한다. 매수·매도는 별도
		// investmentTransactions 로 기록되지만 수수료·배당 같은 일반 거래가 남아
		// 있어서 지출·수입으로 새고 있었다. 여기는 생활 현금 흐름을 세는 자리다.
		if (isInvestmentCashAccountId(tx.accountId)) return;

		if (tx.division && tx.division.length > 0) {
			tx.division.forEach((item) => {
				if (isInternalTransferCategory(item.category)) return;
				// 대출 상환의 원금 부분은 지출이 아니다. 이자만 지출로 본다.
				if (item.payee === 'Principal') return;

				rows.push({
					_id: tx._id,
					accountId: tx.accountId,
					account: tx.account,
					date: tx.date,
					category: item.category,
					subcategory: item.subcategory,
					// 분할 항목의 표시용 이름은 description 에 들어 있다.
					payee: item.description,
					amount: item.amount,
					fromDivision: true
				});
			});
			return;
		}

		if (isInternalTransferCategory(tx.category)) return;

		rows.push(tx);
	});

	return rows;
};

// 지출 행만. 저축률은 수입도 세야 하므로 부호 필터를 분리했다 —
// 예전에는 이 함수가 유일한 진입점이라 수입을 세려면 각 화면이 거래를 다시
// 훑어야 했고, 그 사본마다 분할·면제 처리가 갈렸다.
export const flattenExpenseRows = (transactions = []) =>
	flattenTransactionRows(transactions).filter((row) => row.amount < 0);

// 생활비 면제 판정. 면제 목록에는 '세금:소득세' 처럼 서브카테고리까지 지정된
// 항목이 많으므로 반드시 'category:subcategory' 로 맞춰봐야 한다. 카테고리만으로
// 비교하면 그런 항목이 하나도 걸러지지 않는다.
//
// 비교는 경로 단위다 — '세금' 은 '세금' 자신과 '세금:...' 만 덮는다. 순수
// 문자열 startsWith 였을 때는 '보험' 이 '보험료' 까지 덮었다. 지금 목록에서는
// 두 방식의 결과가 같지만(그렇게 겹치는 짝이 없다) 카테고리를 하나 추가하는
// 순간 조용히 어긋난다.
export const isLivingExpenseExempt = (tx, livingExpenseExempt = []) => {
	const full = fullCategoryOf(tx);
	if (!full) return false;
	return (livingExpenseExempt || []).some(
		(exempt) => full === exempt || full.startsWith(`${exempt}:`)
	);
};
