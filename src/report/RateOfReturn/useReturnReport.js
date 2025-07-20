import { getBalance, getDepositWithdrawalSum, getInvestmentList, getInvestmentBalance } from '../../utils/netWorth';

const findGeometricMean = (returns) => {
	const filteredReturns = returns.filter(i => i !== 0).map(i => parseFloat(i) + 1);
	var result = 1;
	for (var i = 0; i < filteredReturns.length; i++){
		result *= filteredReturns[i];
	}
	return Math.pow(result, 1/filteredReturns.length);
};

const useReturnReport = (allInvestments, allAccountsTransactions, investementTransactions, cashTransactions, historyList, filteredAccounts, allCashAccounts, accountList, exchangeRate) => {
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

		const usdInvestmentAccounts = filteredAccounts.filter(accName => {
			const account = accountList.find(acc => acc.name === accName);
			return account && account.currency === 'USD';
		});
		const krwInvestmentAccounts = filteredAccounts.filter(accName => !usdInvestmentAccounts.includes(accName));

		const krwInvestments = getInvestmentList(allInvestments, allAccountsTransactions, investementTransactions.filter(j => j.date <= curItem.date).filter(k => krwInvestmentAccounts.includes(k.accountId.split(':')[2])));
		const krwInvestmentBalance = getInvestmentBalance(krwInvestments, curItem.date, historyList);

		const usdInvestments = getInvestmentList(allInvestments, allAccountsTransactions, investementTransactions.filter(j => j.date <= curItem.date).filter(k => usdInvestmentAccounts.includes(k.accountId.split(':')[2])));
		const usdInvestmentBalance = getInvestmentBalance(usdInvestments, curItem.date, historyList);

		curItem.investmentBalance = krwInvestmentBalance + (usdInvestmentBalance * exchangeRate);
		curItem.cashBalance = allCashAccounts.reduce((sum, j) => {
			const balance = getBalance(j, allAccountsTransactions, cashTransactions.filter(k => k.date <= curItem.date).filter(l => l.accountId === `account:Bank:${j}`), curItem.date);
			const investmentAccountName = j.split('_')[0];
			const account = accountList.find(acc => acc.name === investmentAccountName);
			if (account && account.currency === 'USD') {
				return sum + (balance * exchangeRate);
			}
			return sum + balance;
		}, 0);
		curItem.netWorth = curItem.investmentBalance + curItem.cashBalance;
		curItem.depositWithdrawalSum = allCashAccounts.reduce((sum, j) => {
			const depositWithdrawal = getDepositWithdrawalSum(j, allAccountsTransactions, cashTransactions.filter(k => k.date > prevItem.date && k.date <= curItem.date).filter(l => l.accountId === `account:Bank:${j}`), curItem.date);
			const investmentAccountName = j.split('_')[0];
			const account = accountList.find(acc => acc.name === investmentAccountName);
			if (account && account.currency === 'USD') {
				return sum + (depositWithdrawal * exchangeRate);
			}
			return sum + depositWithdrawal;
		}, 0);
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

	const initialValue = data[0]?.netWorth || 0;
	const finalValue = data[data.length - 1]?.netWorth || 0;
	const totalCashFlow = data.reduce((sum, d) => sum + (d.depositWithdrawalSum || 0), 0);
	const finalCash = data[data.length - 1]?.cashBalance || 0;
	const capitalGains = finalValue - initialValue - totalCashFlow;

	reportData = [
		// Header Row
		[
			{ type: 'label', value: 'Year' },
			{ type: 'label', value: 'Net Worth' },
			{ type: 'label', value: 'Cash' },
			{ type: 'label', value: 'Investment' },
			{ type: 'label', value: 'Cash Flow' },
			{ type: 'label', value: 'Rate of Return' }
		],
		// Data Rows
		...data.map((item, index) => {
			const year = item.date.substring(0, 4);
			// The first year (index 0) has no return value.
			// `returns` array has one less element than `data` array.
			// returns[i] corresponds to data[i+1].
			const returnRate = index > 0 ? returns[index - 1] : null;
			const returnRateText = returnRate !== null ? `${(returnRate * 100).toFixed(3)}%` : '';

			return [
				{ type: 'label', value: year },
				{ type: 'currency', value: item.netWorth },
				{ type: 'currency', value: item.cashBalance },
				{ type: 'currency', value: item.investmentBalance },
				{ type: 'currency', value: item.depositWithdrawalSum },
				{ type: 'label', value: returnRateText }
			];
		})
	];

	return {
		reportData,
		geometricMean,
		overallSummary: {
			finalValue,
			totalCashFlow,
			capitalGains,
			finalCash
		}
	};
};

export default useReturnReport;