import {
	YEAR_LIST
} from '../../constants';

import { getBalance, getDepositWithdrawalSum, getInvestmentList, getInvestmentBalance } from '../../utils/netWorth';

const findGeometricMean = (returns) => {
	const filteredReturns = returns.filter(i => i !== 0).map(i => parseFloat(i) + 1);
	var result = 1;
	for (var i = 0; i < filteredReturns.length; i++){
		result *= filteredReturns[i];
	}
	return Math.pow(result, 1/filteredReturns.length);
};

const useReturnReport = (allInvestments, allAccountsTransactions, investementTransactions, cashTransactions, historyList, filteredAccounts, allCashAccounts) => {
	let reportData = [];

	let dates = [];
	const date = new Date();
	const currentYear = date.getFullYear();

	for (let i = 2005; i <= currentYear; i++) {
		dates.push(`${i}-12-31`);
	}

	const data = dates.map(i => ({ date: i }));

	for (let i = 0; i < data.length; i++) {
		const curItem = data[i];
		const prevItem = i === 0 ? { date: '0' }:data[i-1];
		const investments = getInvestmentList(allInvestments, allAccountsTransactions, investementTransactions.filter(j => j.date <= curItem.date).filter(k => filteredAccounts.includes(k.accountId.split(':')[2])));
		curItem.investmentBalance = getInvestmentBalance(investments, curItem.date, historyList);
		curItem.cashBalance = allCashAccounts.reduce((sum, j) => getBalance(j, allAccountsTransactions, cashTransactions.filter(k => k.date <= curItem.date).filter(l => l.accountId === `account:Bank:${j}`), curItem.date) + sum, 0);
		curItem.netWorth = curItem.investmentBalance + curItem.cashBalance;
		curItem.depositWithdrawalSum = allCashAccounts.reduce((sum, j) => getDepositWithdrawalSum(j, allAccountsTransactions, cashTransactions.filter(k => k.date > prevItem.date && k.date <= curItem.date).filter(l => l.accountId === `account:Bank:${j}`), curItem.date) + sum, 0);
	}

	const returns = [];

	for (let i = 1; i < data.length; i++) {
		const currentValue = data[i].netWorth;
		const currentDepositWithdrawalSum = data[i].depositWithdrawalSum;
		const previousValue = data[i - 1].netWorth;
		// apply average saving with 1/2 
		const returnRate = ((currentValue - previousValue - currentDepositWithdrawalSum) / (previousValue + currentDepositWithdrawalSum / 2)); //previousValue === 0 ? 0:((currentValue - previousValue - currentDepositWithdrawalSum) / previousValue);
		returns.push(Number.isNaN(returnRate) ? 0:returnRate);
	}

	const geometricMean = findGeometricMean(returns);

	reportData = [
		[
			'Year',
			...YEAR_LIST.map(i => i.key)

		],
		[
			'Net Worth',
			...data.map(i => i.netWorth)
		],
		[
			'Cash',
			...data.map(i => i.cashBalance)
		],
		[
			'Investment',
			...data.map(i => i.investmentBalance)
		],
		[
			'Deposit/Withdrawal',
			...data.map(i => i.depositWithdrawalSum)
		],
		[
			'Rate of Return',
			'',
			...returns.map(i => ((i * 100).toFixed(3) + '%'))
		]
	];

	return { reportData, geometricMean };
};

export default useReturnReport;