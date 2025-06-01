import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import moment from 'moment';

import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis
} from 'recharts';

import { getCategoryColor } from '../../utils/categoryColor';

const week = [
	'Day1',
	'Day2',
	'Day3',
	'Day4',
	'Day5',
	'Day6',
	'Day7'
];

const expenseCategories = [
	'교통비',
	'식비',
	'의료비',
	'교육',
	'육아',
	'생활용품비',
	'의류',
	'대출이자',
	'공과금',
	'미용',
	'보험',
	'수수료',
	'통신비',
	'회비',
	'취미-레저',
	'문화생활',
	'기타 지출',
	'경조사-선물',
	'실제지출아님'
];

const getData = (weekData, transactions, displayCurrency, exchangeRate, accountList) => {
	const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate !== 0) ? exchangeRate : 1;

	return weekData.map((_, index) => {
		const day = moment().subtract(6 - index, 'days').format('YYYY-MM-DD');
		const dayofWeek = moment().subtract(6 - index, 'days').format('ddd');
		const dailyExpenses = {};
		expenseCategories.forEach(category => {
			dailyExpenses[category] = 0;
		});

		for (let k = 0; k < transactions.length; k++) {
			const transaction = transactions[k];
			if (day === transaction.date && transaction.amount < 0) {
				let amount = Math.abs(parseInt(transaction.amount, 10));
				const accountDetails = accountList.find(acc => acc._id === transaction.accountId);
				const transactionOriginalCurrency = accountDetails ? accountDetails.currency : 'KRW';

				if (displayCurrency && transactionOriginalCurrency !== displayCurrency) {
					if (displayCurrency === 'KRW') {
						if (transactionOriginalCurrency === 'USD') {
							amount *= validExchangeRate;
						}
					} else if (displayCurrency === 'USD') {
						if (transactionOriginalCurrency === 'KRW') {
							amount /= validExchangeRate;
						}
					}
				}

				const primaryCategory = transaction.category.split(':')[0];
				if (expenseCategories.includes(primaryCategory)) {
					dailyExpenses[primaryCategory] += amount;
				}
			}
		}
		return {
			dayofWeek,
			...dailyExpenses
		};
	});
};

export function WeeklyGraph () {
	const weeklyTransactions = useSelector((state) => state.weeklyTransactions);
	const weeklyGraphAccountSettings = useSelector((state) => state.settings.weeklyGraphAccount);
	const { currency: displayCurrency, exchangeRate } = useSelector((state) => state.settings.general);
	const accountList = useSelector((state) => state.accountList);

	const filteredTransactions = useMemo(() => {
		const accountsToFilter = Array.isArray(weeklyGraphAccountSettings) ? weeklyGraphAccountSettings : [];
		if (accountsToFilter.length === 0) return [];
		return accountsToFilter.reduce((total, accName) => [...total, ...weeklyTransactions.filter(j => j.account === accName)], []);
	}, [weeklyTransactions, weeklyGraphAccountSettings]);

	const data = useMemo(() => {
		if (!displayCurrency || typeof exchangeRate === 'undefined' || exchangeRate === null || !accountList || accountList.length === 0) {
			return week.map((_, index) => {
				const dayofWeek = moment().subtract(6 - index, 'days').format('ddd');
				const zeroedExpenses = expenseCategories.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {});
				return { dayofWeek, ...zeroedExpenses };
			});
		}
		return getData(week, filteredTransactions, displayCurrency, exchangeRate, accountList);
	}, [filteredTransactions, displayCurrency, exchangeRate, accountList]);

	return (
		<ResponsiveContainer width="99%" height={200}>
			<BarChart
				width={500}
				height={300}
				data={data}
				margin={{
					top: 0, right: 5, left: 20, bottom: 0
				}}
			>
				<XAxis dataKey="dayofWeek" tickLine={false} />
				<YAxis domain={[0, 'dataMax']} axisLine={false} tickLine={false} />
				{
					expenseCategories.map(i => <Bar key={i} dataKey={i} stackId="a" fill={getCategoryColor(i)} />)
				}
			</BarChart>
		</ResponsiveContainer>
	);
}

export default WeeklyGraph;
