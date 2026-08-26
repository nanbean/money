import { EXPENSE_ACCOUNT_TYPES, flattenExpenseRows, accountTypeOf } from '../../utils/expense';

const useTransactions = (allAccountsTransactions, livingExpenseCardOnly, boAOnly) => {
	const inScope = (i) => {
		if (!EXPENSE_ACCOUNT_TYPES.includes(accountTypeOf(i))) return false;
		if (boAOnly && i.account !== 'BoA') return false;
		if (livingExpenseCardOnly && i.account !== '생활비카드') return false;
		return true;
	};

	const scoped = allAccountsTransactions.filter(inScope);
	const incomeTransactions = [];

	// 지출은 Spending / HomeCashFlow 와 같은 전처리를 쓴다. 분할 거래를 하위 항목으로
	// 펼치는 규칙이 화면마다 갈려서 같은 달 합계가 어긋난 적이 있다.
	const expenseTransactions = flattenExpenseRows(scoped);

	scoped.forEach(i => {
		if (i.amount > 0 && !i.category.startsWith('[') && !i.division) {
			incomeTransactions.push(i);
		}
		if (i.division) {
			i.division.forEach(item => {
				if (item.amount > 0 && !item.category.startsWith('[')) {
					incomeTransactions.push({
						account: i.account,
						date: i.date,
						category: item.category,
						subcategory: item.subcategory,
						payee: item.description,
						amount: item.amount
					});
				}
			});
		}
	});

	return { incomeTransactions, expenseTransactions };
};

export default useTransactions;
