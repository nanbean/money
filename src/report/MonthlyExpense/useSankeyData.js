import { useMemo } from 'react';

const useSankeyData = (incomeReport, expenseReport, totalIncomeSum, totalExpenseSum) => {
	const sankeyData = useMemo(() => {
		const data = [['From', 'To', 'Weight']];

		if (incomeReport.length === 0 && expenseReport.length === 0) {
			return [];
		}

		// Income sources to 'Income'
		incomeReport.forEach(income => {
			if (income.sum > 0) {
				const categories = income.category.split(':');
				if (categories.length > 1) {
					// Parent -> Child, then Child -> Income
					data.push([categories[0], income.category, income.sum]);
					data.push([income.category, 'Income', income.sum]);
				} else {
					data.push([income.category, 'Income', income.sum]);
				}
			}
		});

		// 'Income' to 'Expenses' and 'Savings'
		if (totalIncomeSum > 0) {
			const totalExpenses = Math.abs(totalExpenseSum);
			const savings = totalIncomeSum - totalExpenses;
			if (totalExpenses > 0) {
				data.push(['Income', 'Expenses', totalExpenses]);
			}
			if (savings > 0) {
				data.push(['Income', 'Savings', savings]);
			}
		}

		// 'Expenses' to expense categories
		const parentExpenses = {};
		expenseReport.forEach(expense => {
			const expenseAmount = Math.abs(expense.sum);
			if (expenseAmount > 0) {
				const categories = expense.category.split(':');
				if (categories.length > 1) {
					const parent = categories[0];
					// Parent -> Child (full name)
					data.push([parent, expense.category, expenseAmount]);

					if (!parentExpenses[parent]) {
						parentExpenses[parent] = 0;
					}
					parentExpenses[parent] += expenseAmount;
				} else {
					// No subcategory, link from 'Expenses'
					data.push(['Expenses', expense.category, expenseAmount]);
				}
			}
		});

		// Link 'Expenses' to parent expense categories
		for (const parent in parentExpenses) {
			data.push(['Expenses', parent, parentExpenses[parent]]);
		}

		return data.length > 1 ? data : [];
	}, [incomeReport, expenseReport, totalIncomeSum, totalExpenseSum]);

	return { sankeyData };
};

export default useSankeyData;