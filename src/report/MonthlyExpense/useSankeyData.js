import { useMemo } from 'react';

// 계산부는 순수 함수로 둔다 — 훅을 렌더하지 않고 흐름 보존을 검증할 수 있어야 한다.
// '생활비만 보기' 에서 화면에서 빠진 지출을 담는 노드.
export const NON_LIVING_NODE = '생활비 외 지출';

export const buildSankeyData = (incomeReport, expenseReport, totalIncomeSum, totalExpenseSum, exemptExpenseSum = 0) => {
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
	//
	// Sankey 는 흐름이 보존돼야 한다 — 통과 노드의 유입과 유출이 같아야 그림이
	// 성립한다. 예전에는 'Income -> Expenses' 에 지출 전액을 넣고 savings 가
	// 음수면 'Income -> Savings' 만 생략했다. 그러면 지출이 수입을 넘는 해에
	// Income 의 유출이 유입을 초과해 균형이 깨지고, 적자라는 사실은 화면에서
	// 아예 사라졌다. 수입이 0인 해에는 'Income -> Expenses' 자체가 빠져서
	// Expenses 가 유입 없이 유출만 갖는 상태가 됐다.
	const livingExpenses = Math.abs(totalExpenseSum);
	// '생활비만 보기' 가 아니면 0 이라 아래 흐름이 만들어지지 않는다.
	const nonLivingExpenses = Math.abs(exemptExpenseSum);

	// 수입을 지출에 차례로 배분하고, 모자란 만큼을 Deficit 이 메운다.
	// 고정성 지출(생활비 외 — 세금·보험·대출이자)을 먼저 채운다. 줄일 수 없는 몫이다.
	let unallocated = totalIncomeSum;
	const allocate = (amount) => {
		const fromIncome = Math.min(Math.max(unallocated, 0), amount);
		unallocated -= fromIncome;
		return { fromIncome, fromDeficit: amount - fromIncome };
	};

	const nonLiving = allocate(nonLivingExpenses);
	const living = allocate(livingExpenses);

	if (nonLiving.fromIncome > 0) {
		data.push(['Income', NON_LIVING_NODE, nonLiving.fromIncome]);
	}
	if (living.fromIncome > 0) {
		data.push(['Income', 'Expenses', living.fromIncome]);
	}
	if (unallocated > 0) {
		data.push(['Income', 'Savings', unallocated]);
	}
	// 부족분은 저축 인출·차입 등 수입 밖에서 온 돈이다. 별도 유입으로 그려야
	// 유입/유출이 맞고 적자 규모도 눈에 보인다.
	if (nonLiving.fromDeficit > 0) {
		data.push(['Deficit', NON_LIVING_NODE, nonLiving.fromDeficit]);
	}
	if (living.fromDeficit > 0) {
		data.push(['Deficit', 'Expenses', living.fromDeficit]);
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
};

const useSankeyData = (incomeReport, expenseReport, totalIncomeSum, totalExpenseSum, exemptExpenseSum = 0) => {
	const sankeyData = useMemo(
		() => buildSankeyData(incomeReport, expenseReport, totalIncomeSum, totalExpenseSum, exemptExpenseSum),
		[incomeReport, expenseReport, totalIncomeSum, totalExpenseSum, exemptExpenseSum]
	);

	return { sankeyData };
};

export default useSankeyData;
