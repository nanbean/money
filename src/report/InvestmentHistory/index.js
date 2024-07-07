import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

import stc from 'string-to-color';

import InvestmentFilter from '../../components/InvestmentFilter';
import TypeRangeToggles from './TypeRangeToggles.js';

import {
	getHistoryListAction,
	getNetWorthFlowAction
} from '../../actions/couchdbActions';

const CustomTooltip = ({ active, payload, label }) => {
	if (active) {
		return (
			<Stack
				sx={(theme) => ({
					padding: '5px',
					border: '1px solid rgba(34,36,38,.1)',
					borderRadius: '.28571429rem',
					backgroundColor: theme.palette.secondary.main
				})}
			>
				<Typography variant="subtitle1" gutterBottom>
					{`${label.substring(0, 7)}`}
				</Typography>
				{
					payload.map(i => (
						<Typography
							variant="body1"
							gutterBottom
							key={i.dataKey}
							sx={() => ({
								color: stc(i.dataKey)
							})}
						>
							{`${i.dataKey} : ${i.value}`}
						</Typography>
					))
				}
			</Stack>
		);
	}
	return null;
};

CustomTooltip.propTypes = {
	active: PropTypes.bool,
	label: PropTypes.string,
	payload:  PropTypes.array
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
			const currentDate = new Date();
			const currentYear = currentDate.getFullYear();
			const currentMonth = currentDate.getMonth() + 1;
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
	}).map(item => ({
		...item, date: range === 'yearly' ? item.date.substring(0,4):item.date.substring(0,7)
	})), [netWorthFlow, historyList, filteredInvestments, type, range]);

	useEffect(() => {
		dispatch(getHistoryListAction());
		dispatch(getNetWorthFlowAction());
	}, [dispatch]);

	if (netWorthFlow.length > 0) {
		return (
			<React.Fragment>
				<InvestmentFilter
					allInvestments={allInvestments.map(i => i.name).sort()}
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
							<XAxis dataKey="date" />
							<YAxis hide />
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
