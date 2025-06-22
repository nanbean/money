const moment = require('moment-timezone');

const getInvestmentList = (allInvestments, allTransactions, transactions) => {
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
					investments[investmentIdx].gain -= transaction.commission ? transaction.commission : 0;
					investments[investmentIdx].amount += (transaction.amount);
				} else {
					investments.push({
						name: transaction.investment,
						quantity: transaction.quantity,
						price: transaction.price,
						amount: transaction.amount,
						gain: transaction.commission ? -transaction.commission : 0
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
				} else {
					console.log('error');
				}
			} else if (activity === 'ShrsIn') {
				try {
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
							gain: transaction.commission ? -transaction.commission : 0
						});
					}
				} catch (err) {
					console.log(err);
				}
			} else if (activity === 'ShrsOut') {
				if (investmentIdx >= 0) {
					investments[investmentIdx].quantity -= transaction.quantity;
					if (investments[investmentIdx].quantity === 0) {
						investments[investmentIdx].amount = 0;
					} else {
						investments[investmentIdx].amount -= (transaction.price * transaction.quantity);
					}
				} else {
					console.log('error');
				}
			}
		}
	}

	return investments.map(i => {
		const investment = allInvestments.find(j => j.name === i.name);

		if (investment) {
			// update current price
			return {
				...i,
				purchasedPrice: i.price,
				purchasedValue: i.price * i.quantity,
				appraisedValue: investment.price * i.quantity,
				price: investment.price
			};
		} else {
			return {
				...i,
				purchasedPrice: i.price,
				purchasedValue: i.price * i.quantity,
				appraisedValue: i.price * i.quantity
			};
		}
	});
};

const getInvestmentBalance = (investments) => {
	let balance = 0;
	if (investments && investments.length > 0) {
		balance = investments.map(i => (i.price || 0) * (i.quantity || 0))
			.reduce((prev, curr) => prev + curr);
	}

	return balance;
};

const getClosePriceWithHistory = (investments, history) => {
	if (investments && history) {
		const investment = investments.find(j => j._id === history._id.replace('history', 'investment'));
		if (investment) {
			return investment.price;
		}
	}
	return 0;
};

const getSymbolWithName = (investments, name) => {
	if (investments && name) {
		const investment = investments && investments.find(i => i.name === name);

		if (investment && investment.yahooSymbol) {
			return investment.yahooSymbol.substr(0, 6);
		}
	}

	return '';
};

const getGoogleSymbolWithName = (investments, name) => {
	if (investments && name) {
		const investment = investments && investments.find(i => i.name === name);

		if (investment && investment.googleSymbol) {
			return investment.googleSymbol;
		}
	}

	return '';
};

const getInvestmentsFromTransactions = (investements, transactions) => {
	if (investements && transactions) {
		const investmentsTransactions = transactions.filter(i => i.accountId && i.accountId.startsWith('account:Invst'));

		return investmentsTransactions.map(i => ({ _id: `history:${getSymbolWithName(investements, i.investment)}`, name: i.investment }));
	}

	return [];
};

const getInvestmentsFromAccounts = (investments, accounts) => {
	if (!investments || !accounts) return [];

	const accountInvestments = accounts
		.flatMap(account => account.investments)
		.map(({ name, quantity }) => ({ name, quantity }));

	const filteredInvestments = accountInvestments.filter(accountInvestment =>
		investments.some(investment => investment.name === accountInvestment.name)
	);

	const aggregatedQuantities = filteredInvestments.reduce((acc, { name, quantity }) => {
		acc[name] = (acc[name] || 0) + quantity;
		return acc;
	}, {});

	return Object.entries(aggregatedQuantities).map(([name, quantity]) => ({
		name,
		quantity,
		googleSymbol: getGoogleSymbolWithName(investments, name)
	}));
};

module.exports = {
	getInvestmentList,
	getInvestmentBalance,
	getClosePriceWithHistory,
	getSymbolWithName,
	getGoogleSymbolWithName,
	getInvestmentsFromTransactions,
	getInvestmentsFromAccounts,
};