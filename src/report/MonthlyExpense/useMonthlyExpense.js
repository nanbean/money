import moment from 'moment';

import { MONTH_LIST } from '../../constants';

const getStartDate = (year, month) => {
	return moment(`${year}-${month}-01`).format('YYYY-MM-DD');
};

const getEndDate = (year, month) => {
	return moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
};

const useMonthlyExpense = (incomeReport, expenseReport, totalMonthIncomeSum, totalIncomeSum, totalMonthExpenseSum, totalExpenseSum, year) => {
	let reportData = [];

	reportData = [
		[
			{
				value: 'Category'
			},
			...MONTH_LIST.map(i => ({
				value: i
			})),
			{
				value: 'Total'
			}
		]
	];

	if (incomeReport.length > 0 ) {
		reportData = [
			...reportData,
			...incomeReport.map(i => {
				return [
					{
						value: i.category
					},
					...i.month.map((j, index) => ({
						category: i.category,
						value: j,
						startDate: getStartDate(year, index + 1),
						endDate: getEndDate(year, index + 1)
					})),
					{
						value: i.sum
					}
				];
			}),
			[
				{
					value: 'Income Total'
				},
				...totalMonthIncomeSum.map(i => ({
					value: i
				})),
				{
					value: totalIncomeSum
				}
			]
		];
	}
	if (expenseReport.length > 0 ) {
		reportData = [
			...reportData,
			...expenseReport.map(i => {
				return [
					{
						value: i.category
					},
					...i.month.map((j, index) => ({
						category: i.category,
						value: j,
						startDate: getStartDate(year, index + 1),
						endDate: getEndDate(year, index + 1)
					})),
					{
						value: i.sum
					}
				];
			}),
			[
				{
					value: 'Expense Total'
				},
				...totalMonthExpenseSum.map(i => ({
					value: i
				})),
				{
					value: totalExpenseSum
				}
			]
		];
	}

	return reportData;
};

export default useMonthlyExpense;