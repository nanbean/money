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

const getInvestmentBalance = (investments, date, histories) => {
	if (!investments || !investments.length) {
		return 0;
	}

	// Determine if historical data should be used. It's only used for past months.
	const targetMonth = date ? moment(date).format('YYYY-MM') : null;
	const useHistoricalData = targetMonth && histories && targetMonth !== moment().format('YYYY-MM');

	// Pre-process histories into a Map for efficient O(1) lookups inside the loop.
	// This avoids a O(N*M) complexity issue where N is investments and M is histories.
	const historiesMap = useHistoricalData
		? new Map(histories.map(h => [h.name, h.data]))
		: null;

	return investments.reduce((total, investment) => {
		const { name, price = 0, quantity = 0 } = investment;

		if (quantity === 0) {
			return total;
		}

		let effectivePrice = price;

		if (useHistoricalData) {
			const investmentHistoryData = historiesMap.get(name);

			if (investmentHistoryData) {
				// Find the last relevant historical data point for the target month.
				// Iterating backwards is more efficient as we can stop once we find the first match.
				let historicalPrice = null;
				for (let i = investmentHistoryData.length - 1; i >= 0; i--) {
					const record = investmentHistoryData[i];
					// Using substring is faster than creating a moment object in a loop.
					if (record.date.substring(0, 7) === targetMonth) {
						historicalPrice = record.close;
						break; // Found the last entry for the month, no need to continue.
					}
				}

				if (historicalPrice !== null) {
 					if (typeof historicalPrice === 'number' && !isNaN(historicalPrice) && isFinite(historicalPrice)) {
 						effectivePrice = historicalPrice;
 					} else {
 						// Invalid historical price, fallback to current price or 0
 						effectivePrice = typeof price === 'number' && !isNaN(price) && isFinite(price) ? price : 0;
 					}
				}
			}
		}

		return total + (effectivePrice * quantity);
	}, 0);
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
	getInvestmentsFromAccounts
};