import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import moment from 'moment';

import ResponsiveContainer from 'recharts/lib/component/ResponsiveContainer';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis
} from 'recharts';

import useCategoryColor from '../../hooks/useCategoryColor';

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

const getData = (week, filteredTransactions) => week.map((i, index) => {
	const day = moment().subtract(6 - index, 'days').format('YYYY-MM-DD');
	const dayofWeek = moment().subtract(6 - index, 'days').format('ddd');
	const totalExpense = {};
	expenseCategories.forEach(category => {
		totalExpense[category] = 0;
	});
	for (var k = 0; k < filteredTransactions.length; k++) {
		if (day === filteredTransactions[k].date) {
			const transaction = filteredTransactions[k];
			if (transaction.amount < 0) {
				totalExpense[transaction.category] += Math.abs(parseInt(transaction.amount));
			}
			
		}
	}
	return {
		dayofWeek,
		...totalExpense
	};
});

export function WeeklyGraph () {
	const weeklyTransactions = useSelector((state) => state.weeklyTransactions);
	const weeklyGraphAccount = useSelector((state) => state.settings.weeklyGraphAccount);

	const filteredTransactions = useMemo(() => weeklyGraphAccount.reduce((total, i) => [...total, ...weeklyTransactions.filter(j => j.account === i)], []), [weeklyTransactions, weeklyGraphAccount]);
	const data = useMemo(() => getData(week, filteredTransactions), [week, filteredTransactions]);

	return (
		<ResponsiveContainer width="99%" height={200}>
			<BarChart
				width={500}
				height={300}
				data={data}
				margin={{
					top: 0, right: 5, left: 10, bottom: 0
				}}
			>
				<XAxis dataKey="dayofWeek" tickLine={false} />
				<YAxis domain={[0, 'dataMax']} axisLine={false} tickLine={false} />
				{
					expenseCategories.map(i => <Bar key={i} dataKey={i} stackId="a" fill={useCategoryColor(i)} />)
				}
			</BarChart>
		</ResponsiveContainer>
	);
}

export default WeeklyGraph;
