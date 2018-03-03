export function getShrsOutMeanPrice (investmentTransactions, account, date, quantity) {
	if (investmentTransactions.length > 0) {
		const targetInvestmentTransactions = investmentTransactions.find(i => {
			if (i.account === account) {
				return false;
			}
			if (i.transactions.find(j => j.date === date && j.quantity === quantity)) {
				return true;
			}
			return false;
		});
		if (targetInvestmentTransactions) {
			let remainQuantity = 0;
			let meanPrice = 0;
			for (let j = 0; j < targetInvestmentTransactions.transactions.length; j++) {
				const transaction = targetInvestmentTransactions.transactions[j];
				if (transaction.activity === 'Buy') {
					if (meanPrice === 0) {
						meanPrice = transaction.price;
					} else {
						meanPrice = (meanPrice * remainQuantity + transaction.price * transaction.quantity) / (remainQuantity + transaction.quantity)
					}
					remainQuantity += transaction.quantity;
				} else if (transaction.activity === 'MiscExp') {
				} else if (transaction.activity === 'Sell') {
					remainQuantity -= transaction.quantity;
				} else if (transaction.activity === 'Div') {
				} else if (transaction.activity === 'ShrsOut') {
					remainQuantity -= transaction.quantity;
					if (transaction.date === date) {
						break;
					}
				} else if (transaction.activity === 'ShrsIn') {
					remainQuantity += transaction.quantity;
				}
			}
			return meanPrice;
		}
	}

	return 0;
}

export function getInvestmentPerformance (investmentTransactions, investmentPrice) {
	if (investmentTransactions.length > 0 && investmentPrice) {
		return investmentTransactions.map(i => {
			let periodGain = 0;
			let periodDiv = 0;
			let periodMiscExp = 0;
			let remainQuantity = 0;
			let meanPrice = 0;
			for (let j = 0; j < i.transactions.length; j++) {
				const transaction = i.transactions[j];
				if (transaction.activity === 'Buy') {
					periodGain -= (transaction.commission ? transaction.commission : 0);
					if (meanPrice === 0) {
						meanPrice = transaction.price;
					} else {
						meanPrice = (meanPrice * remainQuantity + transaction.price * transaction.quantity) / (remainQuantity + transaction.quantity)
					}
					remainQuantity += transaction.quantity;
				} else if (transaction.activity === 'MiscExp') {
					periodMiscExp -= transaction.amount;
				} else if (transaction.activity === 'Sell') {
					periodGain -= (transaction.commission ? transaction.commission : 0);
					periodGain += ((transaction.price - meanPrice) * transaction.quantity);
					remainQuantity -= transaction.quantity;
				} else if (transaction.activity === 'Div') {
					periodDiv += transaction.amount;
				} else if (transaction.activity === 'ShrsOut') {
					remainQuantity -= transaction.quantity;
				} else if (transaction.activity === 'ShrsIn') {
					const shrsOutMeanPrice = getShrsOutMeanPrice(investmentTransactions, i.account, transaction.date, transaction.quantity)
					if (meanPrice === 0) {
						meanPrice = shrsOutMeanPrice;
					} else {
						meanPrice = (meanPrice * remainQuantity + shrsOutMeanPrice * transaction.quantity) / (remainQuantity + transaction.quantity)
					}
					remainQuantity += transaction.quantity;
				}
			}
			return {
				account: i.account,
				costBasis: meanPrice * remainQuantity,
				marketValue: investmentPrice * remainQuantity,
				periodGain: periodGain + periodDiv + periodMiscExp,
				periodReturn: periodGain + periodDiv + periodMiscExp + (remainQuantity * (investmentPrice - meanPrice)),
				quantity: remainQuantity
			}
		});
	}

	return [];
}

export function getAccountPerformance (account, accountInvestments, allInvestmentsTransactions, allInvestmentsPrice) {
	if (account && accountInvestments.length > 0 && allInvestmentsTransactions.length > 0 && allInvestmentsPrice.length > 0) {
		const accountRemainInvestments = accountInvestments.filter(i => i.quantity > 0);
		return accountRemainInvestments.map(j => {
			const findAllInvestmentsPrice = allInvestmentsPrice.find(k => k.investment === j.name);
			const investmentPrice = findAllInvestmentsPrice && findAllInvestmentsPrice.price ? findAllInvestmentsPrice.price : j.price;
			const findAllInvestmentsTransactions = allInvestmentsTransactions.find(l => l.investment === j.name);
			const investmentTransactions = findAllInvestmentsTransactions && findAllInvestmentsTransactions.transactions ? findAllInvestmentsTransactions.transactions : [];
			const investmentPerformances = getInvestmentPerformance(investmentTransactions, investmentPrice);
			const investmentPerformance = investmentPerformances.find(m => m.account === account);

			if (investmentPerformance) {
				return {
					name: j.name,
					price: investmentPrice,
					costBasis: investmentPerformance.costBasis,
					marketValue: investmentPerformance.marketValue,
					periodGain: investmentPerformance.periodGain,
					periodReturn: investmentPerformance.periodReturn,
					quantity: investmentPerformance.quantity
				}
			} else {
				return {};
			}
		});
	}

	return [];
}
