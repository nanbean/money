const getClosePriceWithHistory = (investments, history) => {
	if (investments && history) {
		const investment = investments.find(j => j._id === history._id.replace('history', 'investment'));
		if (investment) {
			return investment.price
		}
	}
	return 0;
};

exports.getClosePriceWithHistory = getClosePriceWithHistory;

const getSymbolWithName = (investments, name) => {
	if (investments && name) {
		const investment = investments && investments.find(i => i.name === name);

		if (investment && investment.yahooSymbol) {
			return investment.yahooSymbol.substr(0, 6);
		}
	}

	return '';
};

exports.getSymbolWithName = getSymbolWithName;

const getInvestmentsFromTransactions = (investements, transactions) => {
	if (investements && transactions) {
		const investmentsTransactions = transactions.filter(i => i.accountId && i.accountId.startsWith('account:Invst'));

		return investmentsTransactions.map(i => ({_id: `histories:${getSymbolWithName(investements, i.investment)}`, name: i.investment}));
	}

	return [];
};

exports.getInvestmentsFromTransactions = getInvestmentsFromTransactions;

const addInvestmentToDetail = (detail) => {

}

const getBalanceDetail = (account, allTransactions, transactions, date) => {
	let balance = 0;
	const detail = [];

	if (account && allTransactions && transactions && date) {
		for (let i = 0; i < transactions.length; i++) {
			const transaction = transactions[i];
			if (transaction) {
				balance += transaction.amount;
				const investment = detail.find(i => i.investment === transaction.investment);
				if (investment) {
					if (transaction.activity === 'Buy') {
						investment.quantity += transaction.quantity;
					} else if (transaction.activity === 'Sell') {
						investment.quantity -= transaction.quantity;
					}
				} else {
					let newQuantity = 0;
					if (transaction.activity === 'Buy') {
						newQuantity = transaction.quantity;
					} else if (transaction.activity === 'Sell') {
						newQuantity = (transaction.quantity) * -1;
					}
					detail.push({
						investment: transaction.investment,
						quantity: newQuantity
					});
				}
			}
		}

		// We have to subtract ivestment in investment cash account
		if (account.match(/_Cash/i)) {
			const accountId = `account:Invst:${account.split('_')[0]}`;
			const investmemtTransaction = date ? allTransactions.filter(i => i.accountId === accountId && i.date <= date) : allTransactions.filter(i => i.accountId === accountId);

			for (let i = 0; i < investmemtTransaction.length; i++) {
				const transaction = investmemtTransaction[i];
				if (transaction.activity === 'Buy' || transaction.activity === 'MiscExp') {
					balance -= transaction.amount;
				} else if (transaction.activity === 'Sell' || transaction.activity === 'Div') {
					balance += transaction.amount;
				}
			}
		}
	}

	return {
		balance,
		detail
	};
};

exports.getBalanceDetail = getBalanceDetail;