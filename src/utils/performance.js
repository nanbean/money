import _ from 'lodash';

export function getShrsOutMeanPrice (investmentTransactions, account, date, quantity) {
	if (investmentTransactions.length > 0) {
		const shrsOutAccount = investmentTransactions.find(i => i.account !== account && i.activity === 'ShrsOut' &&
														i.date === date && i.quantity === quantity).account;
		const targetInvestmentTransactions = investmentTransactions.filter(i => i.account === shrsOutAccount);
		if (targetInvestmentTransactions) {
			let remainQuantity = 0;
			let meanPrice = 0;
			for (let j = 0; j < targetInvestmentTransactions.length; j++) {
				const transaction = targetInvestmentTransactions[j];
				if (transaction.activity === 'Buy') {
					if (meanPrice === 0) {
						meanPrice = transaction.price;
					} else {
						meanPrice = (meanPrice * remainQuantity + transaction.price * transaction.quantity) / (remainQuantity + transaction.quantity);
					}
					remainQuantity += transaction.quantity;
				} else if (transaction.activity === 'MiscExp') {
					// do nothing
				} else if (transaction.activity === 'Sell') {
					remainQuantity -= transaction.quantity;
				} else if (transaction.activity === 'Div') {
					// do nothing
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
		const grouped = _.groupBy(investmentTransactions, 'account');

		return Object.keys(grouped).map(account => {
			let periodGain = 0;
			let periodDiv = 0;
			let periodMiscExp = 0;
			let remainQuantity = 0;
			let meanPrice = 0;
			for (let j = 0; j < grouped[account].length; j++) {
				const transaction = grouped[account][j];
				if (transaction.activity === 'Buy') {
					periodGain -= (transaction.commission ? transaction.commission : 0);
					if (meanPrice === 0) {
						meanPrice = transaction.price;
					} else {
						meanPrice = (meanPrice * remainQuantity + transaction.price * transaction.quantity) / (remainQuantity + transaction.quantity);
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
					const shrsOutMeanPrice = getShrsOutMeanPrice(investmentTransactions, account, transaction.date, transaction.quantity);
					if (meanPrice === 0) {
						meanPrice = shrsOutMeanPrice;
					} else {
						meanPrice = (meanPrice * remainQuantity + shrsOutMeanPrice * transaction.quantity) / (remainQuantity + transaction.quantity);
					}
					remainQuantity += transaction.quantity;
				}
			}
			return {
				account,
				costBasis: meanPrice * remainQuantity,
				marketValue: investmentPrice * remainQuantity,
				periodGain: periodGain + periodDiv + periodMiscExp,
				periodDiv: periodDiv,
				periodReturn: periodGain + periodDiv + periodMiscExp + (remainQuantity * (investmentPrice - meanPrice)),
				quantity: remainQuantity
			};
		});
	}
	return [];
}

export function getAccountInvestmentPerformance (account, investment, price, investmentTransactions) {
	let periodGain = 0;
	let periodDiv = 0;
	let periodMiscExp = 0;
	let remainQuantity = 0;
	let meanPrice = 0;
	for (let j = 0; j < investmentTransactions.length; j++) {
		const transaction = investmentTransactions[j];
		if (transaction.account === account) {
			if (transaction.activity === 'Buy') {
				periodGain -= (transaction.commission ? transaction.commission : 0);
				if (meanPrice === 0) {
					meanPrice = transaction.price;
				} else {
					meanPrice = (meanPrice * remainQuantity + transaction.price * transaction.quantity) / (remainQuantity + transaction.quantity);
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
				const shrsOutMeanPrice = getShrsOutMeanPrice(investmentTransactions, account, transaction.date, transaction.quantity);
				if (meanPrice === 0) {
					meanPrice = shrsOutMeanPrice;
				} else {
					meanPrice = (meanPrice * remainQuantity + shrsOutMeanPrice * transaction.quantity) / (remainQuantity + transaction.quantity);
				}
				remainQuantity += transaction.quantity;
			}
		}
	}
	return {
		name: investment,
		price,
		costBasis: meanPrice * remainQuantity,
		marketValue: price * remainQuantity,
		periodGain: periodGain + periodDiv + periodMiscExp,
		periodDiv: periodDiv,
		periodReturn: periodGain + periodDiv + periodMiscExp + (remainQuantity * (price - meanPrice)),
		quantity: remainQuantity
	};
}

/**
 * Chain-linked TWR using Modified Dietz per sub-period.
 * Follows the same methodology as report/RateOfReturn/useReturnReport.js.
 *
 * @param {Array<{date: string, investmentsNetWorth: number}>} netWorthPoints - Ordered data points
 * @param {Array} cashTxns - _Cash account transactions from allAccountsTransactions
 * @param {Array} accountList - Account list from Redux store
 * @param {number} exchangeRate - KRW/USD exchange rate
 * @returns {number|null} Cumulative return as decimal, or null if insufficient data
 */
export function computeChainLinkedTwr (netWorthPoints, cashTxns, accountList, exchangeRate) {
	if (!netWorthPoints || netWorthPoints.length < 2) return null;

	let cumReturn = 0;
	for (let i = 1; i < netWorthPoints.length; i++) {
		const prev = netWorthPoints[i - 1];
		const cur = netWorthPoints[i];
		const V0 = prev.investmentsNetWorth;
		if (!V0 || V0 === 0) continue;
		const V1 = cur.investmentsNetWorth;

		// Sum cash flows in sub-period, converting USD-denominated accounts to KRW
		const CF = cashTxns
			.filter(t => t.date > prev.date && t.date <= cur.date)
			.reduce((sum, t) => {
				const investAcct = accountList.find(a => a.name === t.account?.split('_')[0]);
				const amt = investAcct?.currency === 'USD'
					? (t.amount ?? 0) * (exchangeRate || 1)
					: (t.amount ?? 0);
				return sum + amt;
			}, 0);

		const r = (V1 - V0 - CF) / (V0 + CF / 2);
		if (!Number.isFinite(r)) continue;
		cumReturn = (1 + cumReturn) * (1 + r) - 1;
	}

	return cumReturn;
}

export function getAccountPerformance (account, accountInvestments, allInvestmentsTransactions, allInvestmentsPrice) {
	if (account && accountInvestments.length > 0 && allInvestmentsTransactions.length > 0 && allInvestmentsPrice.length > 0) {
		return accountInvestments.filter(i => i.quantity > 0).map(j => {
			return getAccountInvestmentPerformance(
				account,
				j.name,
				allInvestmentsPrice.find(k => k.name === j.name).price,
				allInvestmentsTransactions.filter(l => l.investment === j.name)
			);
		});
	}

	return [];
}
