import moment from 'moment';
import _ from 'lodash';

import { MONTH_LIST } from '../../constants';
import { isLivingExpenseExempt } from '../../utils/expense';

const useExpenseReport = (accountList, expenseTransactions, year, livingExpenseOnly, usd, exchangeRate, reportView, livingExpenseExempt = []) => {
	const startDate = moment(`${year}-01-01`).format('YYYY-MM-DD');
	const endDate = moment(`${year}-12-31`).format('YYYY-MM-DD');
	let expenseReport = [];
	let totalMonthExpenseSum = [];
	let totalExpenseSum = 0;
	// livingExpenseOnly 로 걸러낸 '생활비 외 지출'(세금·보험·대출이자 등) 총액.
	// 화면에서 뺐다고 그 돈이 저축된 것은 아니므로 Sankey 가 별도 흐름으로 그린다.
	let exemptExpenseSum = 0;

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

	// 생활비 면제는 그룹으로 묶기 전에, 거래 단위의 'category:subcategory' 로 판정한다.
	// 면제 목록에는 '세금:소득세' 처럼 서브카테고리까지 지정된 항목이 많은데, 예전에는
	// 그룹 키에 startsWith 를 걸었기 때문에 카테고리 뷰(그룹 키가 '세금')에서는 그런
	// 항목이 하나도 걸러지지 않았다. 같은 달인데도 뷰를 바꾸면 합계가 달라졌다.
	const scopedTransactions = livingExpenseOnly
		? expenseTransactions.filter(i => !isLivingExpenseExempt(i, livingExpenseExempt))
		: expenseTransactions;

	if (livingExpenseOnly) {
		exemptExpenseSum = expenseTransactions
			.filter(i => isLivingExpenseExempt(i, livingExpenseExempt))
			.filter(i => i.date >= startDate && i.date <= endDate)
			.reduce((sum, i) => sum + (isUsdAccount(i.account) ? (i.amount * exchangeRate) : i.amount), 0);
	}

	if (scopedTransactions.length > 0) {
		const groupedExpenseData = _
			.chain(scopedTransactions.filter(k => k.date >= startDate &&  k.date <= endDate))
			.groupBy(x => {
				if (reportView === 'category') {
					return x.category;
				}
				return x.subcategory ? `${x.category}:${x.subcategory}` : x.category;
			})
			.value();

		expenseReport = Object.keys(groupedExpenseData).map(key => {
			return {
				category: key,
				month: MONTH_LIST.map(i => getMonthFiltered(groupedExpenseData, key, i)),
				sum: groupedExpenseData[key].map(i => isUsdAccount(i.account) ? (i.amount * exchangeRate):i.amount).reduce((a, b) => a + b)
			};
		}).sort((a, b) => {
			const aHasParent = a.category.includes(':');
			const bHasParent = b.category.includes(':');

			if (aHasParent && !bHasParent) {
				return -1;
			}
			if (!aHasParent && bHasParent) {
				return 1;
			}

			const categoryA = a.category.toLowerCase();
			const categoryB = b.category.toLowerCase();
			return categoryA.localeCompare(categoryB);
		});

		if (expenseReport.length > 0) {
			totalMonthExpenseSum = MONTH_LIST.map((m, index) => expenseReport.map(i => i.month[index]).reduce((a, b) => a + b));
			totalExpenseSum = expenseReport.map(i => i.sum).reduce((a, b) => a + b);
		}
	}
    
	return { expenseReport, totalMonthExpenseSum, totalExpenseSum, exemptExpenseSum };
};

export default useExpenseReport;