import moment from 'moment';

const getBalance = (name, allTransactions, transactions, date) => {
	let balance = 0;
	for (let i = 0; i < transactions.length; i++) {
		const transaction = transactions[i];
		if (transaction) {
			balance += transaction.amount;
		}
	}

	// We have to subtract ivestment in investment cash account
	if (name.match(/_Cash/i)) {
		const accountId = `account:Invst:${name.split('_')[0]}`;
		const investmemtTransaction = allTransactions.filter(i => i.accountId === accountId && i.date <= date);
		for (let i = 0; i < investmemtTransaction.length; i++) {
			const transaction = investmemtTransaction[i];
			if (transaction.activity === 'Buy' || transaction.activity === 'MiscExp') {
				balance -= transaction.amount;
			} else if (transaction.activity === 'Sell' || transaction.activity === 'Div') {
				balance += transaction.amount;
			}
		}
	}

	return balance;
};

const getInvestmentList = (allTransactions, transactions) => {
	const investments = [];
	for (let i = 0; i < transactions.length; i++) {
		const transaction = transactions[i];
		if (transaction) {
			const activity = transaction.activity;
			const investmentIdx = investments.findIndex((item) => item.name === transaction.investment);
			if (activity === 'Buy') {
				if (investmentIdx >= 0) {
					investments[investmentIdx].price = (investments[investmentIdx].price * investments[investmentIdx].quantity + transaction.price * transaction.quantity) / (investments[investmentIdx].quantity + transaction.quantity);
					investments[investmentIdx].quantity += transaction.quantity;
					investments[investmentIdx].gain -= transaction.commission ? transaction.commission:0;
					investments[investmentIdx].amount += (transaction.amount );
				} else {
					investments.push({
						name: transaction.investment,
						quantity: transaction.quantity,
						price: transaction.price,
						amount: transaction.amount,
						gain: transaction.commission ? -transaction.commission:0
					});
				}
			} else if (transaction.activity === 'Sell') {
				if (investmentIdx >= 0) {
					investments[investmentIdx].gain -= transaction.commission ? transaction.commission : 0;
					investments[investmentIdx].gain -= parseInt(investments[investmentIdx].price * investments[investmentIdx].quantity - transaction.price * transaction.quantity, 10);
					investments[investmentIdx].quantity -= transaction.quantity;
					investments[investmentIdx].amount -= transaction.amount;

					if (investments[investmentIdx].quantity === 0) {
						investments[investmentIdx].amount = 0;
					}
				}
			} else if (activity === 'ShrsIn') {
				const shrsOutTransactionFind = allTransactions.find(i => i.activity === 'ShrsOut' && i.investment === transaction.investment && i.date === transaction.date);
				const shrsOutTransactionPrice = shrsOutTransactionFind && shrsOutTransactionFind.price;

				if (investmentIdx >= 0) {
					investments[investmentIdx].price = (investments[investmentIdx].price * investments[investmentIdx].quantity + shrsOutTransactionPrice * transaction.quantity) / (investments[investmentIdx].quantity + transaction.quantity);
					investments[investmentIdx].quantity += transaction.quantity;
				} else {
					investments.push({
						name: transaction.investment,
						quantity: transaction.quantity,
						price: shrsOutTransactionPrice,
						amount: transaction.amount,
						gain: transaction.commission ? -transaction.commission:0
					});
				}
			} else if (activity === 'ShrsOut') {
				if (investmentIdx >= 0) {
					investments[investmentIdx].quantity -= transaction.quantity;
					investments[investmentIdx].amount -= transaction.amount;
				}
			}
		}
	}
  
	return investments.filter(i => i.quantity > 0);
};

const getInvestmentBalance = (allInvestments, investments, historyList, date) => {
	const yearMonthDate = date.substr(0, 7);
	let balance = 0;
	if (investments.length > 0 && historyList.length > 0) {
		balance = investments.map(i => {
			const history = historyList.find(j => j.name === i.name);
			const historyData = history && history.data && history.data.find(j => j.date.startsWith(yearMonthDate));
			const price = historyData && historyData.close;
			if (date > moment().format('YYYY-MM-DD')) {
				const investment = allInvestments.find(j => j.name === i.name);
      
				if (investment) {
					return price ? (price * i.quantity) : (investment.price * i.quantity);
				} else {
					return i.price * i.quantity;
				}	
			}
			return price ? (price * i.quantity) : (i.price * i.quantity);
		}).reduce( (prev, curr) => prev + curr );
	}

	return balance;
};

export function getNetWorth (accountList, allInvestments, allAccountsTransactions, historyList, date) {
	let netWorth = 0;
	const filteredAllAccountsTransactions = allAccountsTransactions.filter(i => i.date <= date);
	accountList.forEach(i => {
		const transactions = filteredAllAccountsTransactions.filter(j => j.account === i.name);
		if (i.type === 'Invst') {
			const investments = getInvestmentList(allAccountsTransactions, transactions);
			netWorth += getInvestmentBalance(allInvestments, investments, historyList, date);
		} else {
			netWorth += getBalance(i.name, allAccountsTransactions, transactions, date);
		}
	});
	return netWorth;
}