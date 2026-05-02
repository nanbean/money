import { getBalance, getDepositWithdrawalSum, getInvestmentList, getInvestmentBalance } from '../../utils/netWorth';

const findGeometricMean = (returns) => {
	// Include 0% years — multiplying by 1 doesn't change the product, but
	// dropping them shrinks n and inflates the mean. Return 1 for empty input
	// so callers (which display geometricMean - 1) render 0%.
	if (returns.length === 0) return 1;
	const factors = returns.map(i => i + 1);
	let result = 1;
	for (let i = 0; i < factors.length; i++) {
		result *= factors[i];
	}
	return Math.pow(result, 1 / factors.length);
};

const useReturnReport = (allInvestments, allAccountsTransactions, investementTransactions, cashTransactions, historyList, filteredAccounts, allCashAccounts, accountList, exchangeRate) => {
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

	data[0].cumulativeReturn = 0;
	data[0].returnRate = null;

	for (let i = 1; i < data.length; i++) {
		const currentValue = data[i].netWorth;
		const currentDepositWithdrawalSum = data[i].depositWithdrawalSum;
		const previousValue = data[i - 1].netWorth;
		// Modified Dietz simplification: assume cashflows are spread evenly
		// across the year, so weight them by 1/2 in the average capital base.
		const returnRate = ((currentValue - previousValue - currentDepositWithdrawalSum) / (previousValue + currentDepositWithdrawalSum / 2));
		const currentReturn = Number.isNaN(returnRate) ? 0 : returnRate;
		const prevCumulativeReturn = data[i - 1].cumulativeReturn || 0;
		data[i].cumulativeReturn = (1 + prevCumulativeReturn) * (1 + currentReturn) - 1;
		data[i].returnRate = Number.isNaN(returnRate) ? null : returnRate;
		returns.push(Number.isNaN(returnRate) ? 0 : returnRate);
	}

	const geometricMean = findGeometricMean(returns);

	const initialValue = data[0]?.netWorth || 0;
	const finalValue = data[data.length - 1]?.netWorth || 0;
	// data[0].depositWithdrawalSum collapses every cashflow up to and including
	// the start year (prevItem.date === '0'), and that cashflow is already
	// reflected in initialValue. Sum only the post-start years to avoid double
	// counting it when computing capital gains.
	const totalCashFlow = data.slice(1).reduce((sum, d) => sum + (d.depositWithdrawalSum || 0), 0);
	const finalCash = data[data.length - 1]?.cashBalance || 0;
	const capitalGains = finalValue - initialValue - totalCashFlow;

	return {
		chartData: data,
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