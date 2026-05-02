import moment from 'moment';

export const getBalance = (name, allTransactions, transactions, date) => {
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

	return balance;
};

export const getDepositWithdrawalSum = (name, allTransactions, transactions) => {
	let balance = 0;
	for (let i = 0; i < transactions.length; i++) {
		const transaction = transactions[i];
		if (transaction) {
			balance += transaction.amount;
		}
	}

	return balance;
};

export const getInvestmentList = (allInvestments, allTransactions, transactions) => {
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
					// eslint-disable-next-line no-console
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
					// eslint-disable-next-line no-console
					console.log(err);
				}
			} else if (activity === 'ShrsOut') {
				if (investmentIdx >= 0) {
					investments[investmentIdx].quantity -= transaction.quantity;
					investments[investmentIdx].amount -= transaction.amount;
				} else {
					// eslint-disable-next-line no-console
					console.log('error');
				}
			}
		}
	}

	return investments.map(i => {
		const investment = allInvestments.find(j => j.name === i.name);
		// Fall back to the purchased price when the live feed entry is missing
		// or hasn't loaded a price yet — otherwise downstream NaNs propagate
		// through reduce() and zero out every subsequent year's balance.
		const livePrice = investment && Number.isFinite(investment.price) ? investment.price : null;
		const safeMeanPrice = Number.isFinite(i.price) ? i.price : 0;
		const effectivePrice = livePrice ?? safeMeanPrice;

		if (investment) {
			return {
				...i,
				purchasedPrice: safeMeanPrice,
				purchasedValue: safeMeanPrice * i.quantity,
				appraisedValue: effectivePrice * i.quantity,
				price: effectivePrice
			};
		} else {
			return {
				...i,
				purchasedPrice: safeMeanPrice,
				purchasedValue: safeMeanPrice * i.quantity,
				appraisedValue: safeMeanPrice * i.quantity,
				price: safeMeanPrice
			};
		}
	});
};

export const getInvestmentBalance = (investments, date, histories) => {
	const currentYearMonth = moment().format('YYYY-MM');
	const safeMul = (a, b) => {
		const v = a * b;
		return Number.isFinite(v) ? v : 0;
	};
	let balance = 0;
	if (investments.length > 0) {
		balance = investments.map(i => {
			if (date && histories) {
				if (i.quantity > 0) {
					const dateYearMonth = date.substr(0,7);
					const investment = investments.find(j => j.name === i.name);
					const history = histories.find(j => j.name === i.name);
					const historical = history && history.data.filter(k => {
						return k.date.substr(0,7) === dateYearMonth;
					});
					const historicalPrice = historical && historical.length > 0 && historical[historical.length - 1].close;
					if (currentYearMonth === dateYearMonth) {
						return safeMul(investment.price, i.quantity);
					}
					if (historicalPrice) {
						return safeMul(historicalPrice, i.quantity);
					}
				}
			}
			return safeMul(i.price, i.quantity);
		})
			.reduce((prev, curr) => prev + curr, 0);
	}

	return balance;
};