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

import {
	getCategoryColor
} from '../../utils/categoryColor';

const week = [
	'Day1',
	'Day2',
	'Day3',
	'Day4',
	'Day5',
	'Day6',
	'Day7'
];

const getData = (week, filteredTransactions) => week.map((i, index) => {
	const day = moment().subtract(6 - index, 'days').format('YYYY-MM-DD');
	const dayofWeek = moment().subtract(6 - index, 'days').format('ddd');
	const totalExpense = {
		'교통비': 0,
		'식비': 0,
		'의료비': 0,
		'교육': 0,
		'육아': 0,
		'생활용품비': 0,
		'의류': 0,
		'대출이자': 0,
		'공과금': 0,
		'미용': 0,
		'보험': 0,
		'수수료': 0,
		'통신비': 0,
		'회비': 0,
		'취미-레저': 0,
		'문화생활': 0,
		'기타 지출': 0,
		'경조사-선물': 0,
		'실제지출아님': 0
	};
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
				<XAxis dataKey="dayofWeek" />
				<YAxis domain={[0, 'dataMax']} />
				<Bar dataKey="식비" stackId="a" fill={getCategoryColor('식비')} />
				<Bar dataKey="교통비" stackId="a" fill={getCategoryColor('교통비')} />
				<Bar dataKey="문화생활" stackId="a" fill={getCategoryColor('문화생활')} />
				<Bar dataKey="경조사-선물" stackId="a" fill={getCategoryColor('경조사-선물')} />
				<Bar dataKey="교육" stackId="a" fill={getCategoryColor('교육')} />
				<Bar dataKey="육아" stackId="a" fill={getCategoryColor('육아')} />
				<Bar dataKey="생활용품비" stackId="a" fill={getCategoryColor('생활용품비')} />
				<Bar dataKey="의류" stackId="a" fill={getCategoryColor('의류')} />
				<Bar dataKey="대출이자" stackId="a" fill={getCategoryColor('대출이자')} />
				<Bar dataKey="공과금" stackId="a" fill={getCategoryColor('공과금')} />
				<Bar dataKey="미용" stackId="a" fill={getCategoryColor('미용')} />
				<Bar dataKey="보험" stackId="a" fill={getCategoryColor('보험')} />
				<Bar dataKey="수수료" stackId="a" fill={getCategoryColor('수수료')} />
				<Bar dataKey="통신비" stackId="a" fill={getCategoryColor('통신비')} />
				<Bar dataKey="회비" stackId="a" fill={getCategoryColor('회비')} />
				<Bar dataKey="의료비" stackId="a" fill={getCategoryColor('의료비')} />
				<Bar dataKey="취미-레저" stackId="a" fill={getCategoryColor('취미-레저')} />
				<Bar dataKey="기타 지출" stackId="a" fill={getCategoryColor('기타 지출')} />
				<Bar dataKey="실제지출아님" stackId="a" fill={getCategoryColor('실제지출아님')} />
			</BarChart>
		</ResponsiveContainer>
	);
}

export default WeeklyGraph;
