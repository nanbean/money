import moment from 'moment';
import _ from 'lodash';

import { MONTH_LIST } from '../../constants';

const useIncomeReport = (accountList, incomeTransactions, year, usd, exchangeRate) => {
	const startDate = moment(`${year}-01-01`).format('YYYY-MM-DD');
	const endDate = moment(`${year}-12-31`).format('YYYY-MM-DD');
	let incomeReport = [];
	let totalMonthIncomeSum = [];
	let totalIncomeSum = 0;

	const isUsdAccount = (account) => {
		const accountItem = accountList.find(i => i.name === account);
		if (accountItem.currency === 'USD') {
			return true;
		}

		return false;
	};

	const getMonthFiltered = (data, key, month) => {
		const filtered = data[key].filter(i => i.date.substr(5, 2) === month);

		if (filtered.length > 0) {
			return filtered.map(i => usd ? (isUsdAccount(i.account) ? i.amount:(i.amount / exchangeRate)):(isUsdAccount(i.account) ? (i.amount * exchangeRate):i.amount)).reduce((a, b) => a + b);
		}

		return 0;
	};

	if (incomeTransactions.length > 0) {
		const groupedIncomeData = _
			.chain(incomeTransactions.filter(k => k.date >= startDate &&  k.date <= endDate))
			.groupBy(x => x.subcategory ? `${x.category}:${x.subcategory}` : x.category)
			.value();
  
		incomeReport = Object.keys(groupedIncomeData).map(key => {
			return {
				category: key,
				month: MONTH_LIST.map(i => getMonthFiltered(groupedIncomeData, key, i)),
				sum: groupedIncomeData[key].map(i => usd ? (isUsdAccount(i.account) ? i.amount:(i.amount / exchangeRate)):(isUsdAccount(i.account) ? (i.amount * exchangeRate):i.amount)).reduce((a, b) => a + b)
			};
		}).sort((a, b) => {
			const categoryA = a.category.toLowerCase();
			const categoryB = b.category.toLowerCase();
			if (categoryA < categoryB) {
				return -1;
			}
			if (categoryB < categoryA) {
				return 1;
			}
			return 0;
		});
  
		totalMonthIncomeSum = incomeReport.length > 0 && MONTH_LIST.map((m, index) => incomeReport.map(i => i.month[index]).reduce((a, b) => a + b));
		totalIncomeSum = incomeReport.length > 0 && incomeReport.map(i => i.sum).reduce((a, b) => a + b);
	}
    
	return { incomeReport, totalMonthIncomeSum, totalIncomeSum };
};

export default useIncomeReport;