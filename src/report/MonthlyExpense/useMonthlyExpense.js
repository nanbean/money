import moment from 'moment';

import { MONTH_LIST } from '../../constants';

const getStartDate = (year, month) => {
	return moment(`${year}-${month.toString().padStart(2, '0')}-01`).format('YYYY-MM-DD');
};

const getEndDate = (year, month) => {
	return moment(`${year}-${month.toString().padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
};

const useMonthlyExpense = (incomeReport, expenseReport, totalMonthIncomeSum, totalIncomeSum, totalMonthExpenseSum, totalExpenseSum, year) => {
	let reportData = [];

	reportData = [
		[
			{
				type: 'label',
				value: 'Category'
			},
			...MONTH_LIST.map((i, index) => ({
				type: 'label',
				value: i,
				startDate: getStartDate(year, index + 1),
				endDate: getEndDate(year, index + 1)
			})),
			{
				type: 'label',
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
						category: i.category,
						value: i.sum,
						startDate: getStartDate(year, 1),
						endDate: getEndDate(year, 12)
					}
				];
			}),
			[
				{
					cellColor: true,
					type: 'label',
					value: 'Income Total'
				},
				...totalMonthIncomeSum.map(i => ({
					cellColor: true,
					value: i
				})),
				{
					cellColor: true,
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
						category: i.category,
						value: i.sum,
						startDate: getStartDate(year, 1),
						endDate: getEndDate(year, 12)
					}
				];
			}),
			[
				{
					cellColor: true,
					type: 'label',
					value: 'Expense Total'
				},
				...totalMonthExpenseSum.map(i => ({
					cellColor: true,
					value: i
				})),
				{
					cellColor: true,
					value: totalExpenseSum
				}
			]
		];
	}

	return reportData;
};

export default useMonthlyExpense;