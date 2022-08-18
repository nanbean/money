import { MONTH_LIST } from '../../constants';

const useMonthlyExpense = (incomeReport, expenseReport, totalMonthIncomeSum, totalIncomeSum, totalMonthExpenseSum, totalExpenseSum) => {
	let reportData = [];

	reportData = [
		[
			'Category',
			...MONTH_LIST,
			'Total'
		]
	];

	if (incomeReport.length > 0 ) {
		reportData = [
			...reportData,
			...incomeReport.map(i => {
				return [
					i.category,
					...i.month,
					i.sum
				];
			}),
			[
				'Income Total',
				...totalMonthIncomeSum,
				totalIncomeSum
			]
		];
	}
	if (expenseReport.length > 0 ) {
		reportData = [
			...reportData,
			...expenseReport.map(i => {
				return [
					i.category,
					...i.month,
					i.sum
				];
			}),
			[
				'Expense Total',
				...totalMonthExpenseSum,
				totalExpenseSum
			]
		];
	}

	return reportData;
};

export default useMonthlyExpense;