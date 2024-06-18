const useTransactions = (allAccountsTransactions, livingExpenseCardOnly, boAOnly) => {
	let incomeTransactions = [];
	let expenseTransactions = [];

	allAccountsTransactions.forEach(i => {
		if (i.type === 'CCard' || i.type === 'Bank' || i.type === 'Cash') {
			if (boAOnly && i.account !== 'BoA') {
				return;
			}
			if (livingExpenseCardOnly && i.account !== '생활비카드') {
				return;
			}
			if (i.amount > 0 && !i.category.startsWith('[') && !i.division) {
				incomeTransactions.push(i);
			}
			if (i.amount < 0 && !i.category.startsWith('[') && !i.division) {
				expenseTransactions.push(i);
			}
			if (i.division) {
				for (let j = 0; j < i.division.length; j++) {
					const transaction = i.division[j];
					if (transaction.amount > 0 && !transaction.category.startsWith('[')) {
						incomeTransactions.push({
							account: i.account,
							date: i.date,
							category: transaction.category,
							subcategory: transaction.subcategory,
							payee: transaction.description,
							amount: transaction.amount
						});
					} else if (transaction.amount < 0 && !transaction.category.startsWith('[') && transaction.payee !== 'Principal') {
						expenseTransactions.push({
							account: i.account,
							date: i.date,
							category: transaction.category,
							subcategory: transaction.subcategory,
							payee: transaction.description,
							amount: transaction.amount
						});
					}
				}
			}
		}
	});

	if (livingExpenseCardOnly) {
		incomeTransactions = incomeTransactions.filter(i => i.account === '생활비카드');
		expenseTransactions = expenseTransactions.filter(i => i.account === '생활비카드');
	}
	
	return { incomeTransactions, expenseTransactions };
};

export default useTransactions;