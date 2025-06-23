import moment from 'moment';
import _ from 'lodash';

import { MONTH_LIST } from '../../constants';

const useExpenseReport = (accountList, expenseTransactions, year, livingExpenseOnly, usd, exchangeRate) => {
	const startDate = moment(`${year}-01-01`).format('YYYY-MM-DD');
	const endDate = moment(`${year}-12-31`).format('YYYY-MM-DD');
	let expenseReport = [];
	let totalMonthExpenseSum = [];
	let totalExpenseSum = 0;

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
			return filtered.map(i => isUsdAccount(i.account) ? (i.amount * exchangeRate):i.amount).reduce((a, b) => a + b);
		}

		return 0;
	};

	if (expenseTransactions.length > 0) {
		const groupedExpenseData = _
			.chain(expenseTransactions.filter(k => k.date >= startDate &&  k.date <= endDate))
			.groupBy(x => x.subcategory ? `${x.category}:${x.subcategory}` : x.category)
			.value();

		expenseReport = Object.keys(groupedExpenseData).map(key => {
			return {
				category: key,
				month: MONTH_LIST.map(i => getMonthFiltered(groupedExpenseData, key, i)),
				sum: groupedExpenseData[key].map(i => isUsdAccount(i.account) ? (i.amount * exchangeRate):i.amount).reduce((a, b) => a + b)
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

		if (livingExpenseOnly) {
			const exemptionCategory = [
				'세금',
				'대출이자',
				'보험',
				'실제지출아님',
				'취미-레저:여행',
				'교통비:차량구입비',
				'건축'
			];
			expenseReport = expenseReport.filter(i => !exemptionCategory.find(j => i.category && i.category.startsWith(j)));
		}
		if (expenseReport.length > 0) {
			totalMonthExpenseSum = MONTH_LIST.map((m, index) => expenseReport.map(i => i.month[index]).reduce((a, b) => a + b));
			totalExpenseSum = expenseReport.map(i => i.sum).reduce((a, b) => a + b);
		}
	}
    
	return { expenseReport, totalMonthExpenseSum, totalExpenseSum };
};

export default useExpenseReport;