import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import LinearProgress from '@mui/material/LinearProgress';

import stc from 'string-to-color';

import InvestmentFilter from '../../components/InvestmentFilter';
import TypeRangeToggles from './TypeRangeToggles.js';

import {
	getHistoryListAction,
	getNetWorthFlowAction
} from '../../actions/couchdbActions';

import toolTipStyles from '../../assets/jss/components/toolTip.js';

const CustomTooltip = ({ active, payload, label }) => {
	if (active) {
		return (
			<div style={{ ...toolTipStyles.root }} >
				<div style={{ ...toolTipStyles.label }} >{`${label.substring(0, 7)}`}</div>
				{
					payload.map(i => (
						<div key={i.dataKey} style={{ ...toolTipStyles.item }} >{`${i.dataKey} : ${i.value}`}</div>
					))
				}
			</div>
		);
	}

	return null;
};

CustomTooltip.propTypes = {
	active: PropTypes.bool.isRequired,
	label: PropTypes.string.isRequired,
	payload:  PropTypes.array.isRequired
};

function InvestmentHistory () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const allInvestmentsPrice = useSelector((state) => state.allInvestmentsPrice);
	const filteredInvestments = useSelector((state) => state.filteredInvestments);
	const netWorthFlow = useSelector((state) => state.netWorthFlow);
	const historyList = useSelector((state) => state.historyList);
	const [type, setType] = useState('quantity');
	const [range, setRange] = useState('monthly');
	const dispatch = useDispatch();

	const currentDate = new Date();
	const currentYear = currentDate.getFullYear();
	const currentMonth = currentDate.getMonth() + 1;

	const handleTypeChange = (event, newType) => {
		setType(newType);
	};

	const handleRangeChange = (event, newRange) => {
		setRange(newRange);
	};

	const allInvestments = useMemo(() => allInvestmentsPrice.filter(i => allAccountsTransactions.find(j => j.investment === i.name)), [allAccountsTransactions, allInvestmentsPrice]);
	const investmentHistory = useMemo(() => netWorthFlow.map(i => {
		const item = {
			date: i.date
		};
		filteredInvestments.forEach(j => {
			if (i.netInvestments.length > 0) {
				item[j] = i.netInvestments.filter(k => k.name === j).reduce((sum, l) => {
					if (type === 'amount') {
						const history = historyList.find(h => h.name === j);
						const historyData = history && history.data && history.data.find(hd => hd.date.startsWith(i.date));
						const price = historyData && historyData.close;
						return sum + l.quantity * (price || l.price);
					}
					return sum + l.quantity;
				}, 0);
			}
		});

		return item;
	}).filter(item => {
		if (range === 'yearly') {
			const date = new Date(item.date);
			const month = date.getMonth() + 1;
			const year = date.getFullYear();

			if (year !== currentYear) {
				return month === 12;
			} else {
				return year === currentYear && month === currentMonth;
			}
		}

		return true;
	}), [netWorthFlow, historyList, filteredInvestments, type, range]);

	useEffect(() => {
		dispatch(getHistoryListAction());
		dispatch(getNetWorthFlowAction());
	}, []);

	if (netWorthFlow.length > 0) {
		return (
			<React.Fragment>
				<InvestmentFilter
					allInvestmentsPrice={allInvestments}
					filteredInvestments={filteredInvestments}
				/>
				<TypeRangeToggles type={type} range={range} onTypeChange={handleTypeChange} onRangeChange={handleRangeChange} />
				{
					netWorthFlow.length > 1 &&
					<ResponsiveContainer width="100%" height={400}>
						<BarChart
							data={investmentHistory}
							margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
						>
							<XAxis dataKey="date"/>
							<YAxis hide/>
							<Tooltip content={<CustomTooltip />} />
							{
								filteredInvestments.map(i => (
									<Bar key={i} dataKey={i} stackId="a" fill={stc(i)} />
								))
							}
						</BarChart>
					</ResponsiveContainer>
				}
			</React.Fragment>
		);
	} else {
		return (
			<React.Fragment>
				<LinearProgress
					color="secondary"
					sx={(theme) => ({
						zIndex: theme.zIndex.drawer + 2,
						position: 'sticky',
						top: 64,
						[theme.breakpoints.down('sm')]: {
							top: 56
						}
					})}
				/>
			</React.Fragment>
		);
	}
}

export default InvestmentHistory;
