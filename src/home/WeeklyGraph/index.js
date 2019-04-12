import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import moment from 'moment';

import ResponsiveContainer from 'recharts/lib/component/ResponsiveContainer';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid
} from 'recharts';

import { getWeeklyTransactionsAction } from '../../actions/transactionActions';

const week = [
	'Day1',
	'Day2',
	'Day3',
	'Day4',
	'Day5',
	'Day6',
	'Day7'
];

export class WeeklyGraph extends Component {
	componentDidMount () {
		this.props.getWeeklyTransactionsAction(moment().subtract(1, 'weeks').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD'));
	}
  
	render () {
		const { weeklyTransactions } = this.props;
		const filteredTransactions = weeklyTransactions.filter(i => i.type === 'Bank' || i.type === 'CCard' || i.type === 'Cash');
    
		const data = week.map((i, index) => {
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
						totalExpense[transaction.category] += Math.abs(transaction.amount);
					}
					
				}
			}
			return {
				dayofWeek,
				...totalExpense
			};
		});

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
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="dayofWeek" />
					<YAxis domain={[0, 'dataMax']} />
					<Bar dataKey="식비" stackId="a" fill="#e4815f" />
					<Bar dataKey="교통비" stackId="a" fill="#5e9cd4" />
					<Bar dataKey="문화생활" stackId="a" fill="#d071c8" />
					<Bar dataKey="경조사-선물" stackId="a" fill="#d071c8" />
					<Bar dataKey="교육" stackId="a" fill="#a18dcd" />
					<Bar dataKey="육아" stackId="a" fill="#a18dcd" />
					<Bar dataKey="생활용품비" stackId="a" fill="#e5a54f" />
					<Bar dataKey="의류" stackId="a" fill="#e5a54f" />
					<Bar dataKey="대출이자" stackId="a" fill="#e5a54f" />
					<Bar dataKey="공과금" stackId="a" fill="#e5a54f" />
					<Bar dataKey="미용" stackId="a" fill="#e5a54f" />
					<Bar dataKey="보험" stackId="a" fill="#e5a54f" />
					<Bar dataKey="수수료" stackId="a" fill="#e5a54f" />
					<Bar dataKey="통신비" stackId="a" fill="#e5a54f" />
					<Bar dataKey="회비" stackId="a" fill="#e5a54f" />
					<Bar dataKey="의료비" stackId="a" fill="#e55266" />
					<Bar dataKey="취미-레저" stackId="a" fill="#65b362" />
					<Bar dataKey="기타 지출" stackId="a" fill="#c0c0c0" />
					<Bar dataKey="실제지출아님" stackId="a" fill="#c0c0c0" />
				</BarChart>
			</ResponsiveContainer>
		);
	}
}

WeeklyGraph.propTypes = {
	classes: PropTypes.object.isRequired,
	getWeeklyTransactionsAction: PropTypes.func.isRequired,
	weeklyTransactions:  PropTypes.array.isRequired
};

const mapStateToProps = state => ({
	weeklyTransactions: state.weeklyTransactions
});

const mapDispatchToProps = dispatch => ({
	getWeeklyTransactionsAction (start, end) {
		dispatch(getWeeklyTransactionsAction(start, end));
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(WeeklyGraph);
