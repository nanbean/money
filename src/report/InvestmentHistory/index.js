import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

import { useTheme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

import stc from 'string-to-color';

import InvestmentFilter from '../../components/InvestmentFilter';
import ChartControls from './ChartControls.js';

import {
	getHistoryListAction
} from '../../actions/couchdbActions';

import {
	getNetWorthFlowAction
} from '../../actions/couchdbReportActions';

import { toCurrencyFormat } from '../../utils/formatting';

const CustomTooltip = ({ active, payload, label }) => {
	if (active && payload && payload.length) {
		return (
			<Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, minWidth: 150, boxShadow: 3 }}>
				<Typography variant="subtitle2" gutterBottom>{label}</Typography>
				{payload
					.filter(entry => entry.value > 0)
					.sort((a, b) => b.value - a.value)
					.map(entry => (
						<Stack key={entry.dataKey} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
							<Stack direction="row" spacing={0.5} alignItems="center">
								<Box sx={{ width: 10, height: 10, bgcolor: entry.fill, borderRadius: '2px' }} />
								<Typography variant="caption">{entry.name}</Typography>
							</Stack>
							<Typography variant="caption">{toCurrencyFormat(entry.value)}</Typography>
						</Stack>
					))}
			</Box>
		);
	}
	return null;
};

CustomTooltip.propTypes = {
	active: PropTypes.bool,
	label: PropTypes.string,
	payload: PropTypes.array
};

function InvestmentHistory () {
	const theme = useTheme();
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const allInvestmentsPrice = useSelector((state) => state.allInvestmentsPrice);
	const filteredInvestments = useSelector((state) => state.filteredInvestments);
	const netWorthFlow = useSelector((state) => state.netWorthFlow);
	const historyList = useSelector((state) => state.historyList);
	const { currency: displayCurrency, exchangeRate, investmentHistoryRange = 'monthly', investmentHistoryType = 'quantity' } = useSelector((state) => state.settings);
	const dispatch = useDispatch();

	const allInvestments = useMemo(() => allInvestmentsPrice.filter(i => allAccountsTransactions.find(j => j.investment === i.name)), [allAccountsTransactions, allInvestmentsPrice]);
	const investmentHistory = useMemo(() => netWorthFlow.map(i => {
		const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate !== 0) ? exchangeRate : 1;
		const item = {
			date: i.date
		};
		filteredInvestments.forEach(j => {
			if (i.netInvestments.length > 0) {
				let calculatedValue = i.netInvestments.filter(k => k.name === j).reduce((sum, l) => {
					if (investmentHistoryType === 'amount') {
						const history = historyList.find(h => h.name === j);
						const historyData = history && history.data && history.data.find(hd => hd.date.startsWith(i.date));
						const price = historyData && historyData.close;
						return sum + l.quantity * (price || l.price);
					}
					return sum + l.quantity;
				}, 0);

				if (investmentHistoryType === 'amount' && displayCurrency && exchangeRate !== undefined) {
					const investmentDetails = allInvestments.find(inv => inv.name === j);
					const investmentOriginalCurrency = investmentDetails && investmentDetails.currency ? investmentDetails.currency : 'KRW';

					if (investmentOriginalCurrency !== displayCurrency) {
						if (displayCurrency === 'KRW') {
							if (investmentOriginalCurrency === 'USD') {
								calculatedValue *= validExchangeRate;
							}
						} else if (displayCurrency === 'USD') {
							if (investmentOriginalCurrency === 'KRW') {
								calculatedValue /= validExchangeRate;
							}
						}
					}
				}
				item[j] = calculatedValue;
			}
		});

		return item;
	}).filter(item => {
		if (investmentHistoryRange === 'yearly') {
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
		...item, date: investmentHistoryRange === 'yearly' ? item.date.substring(0,4):item.date.substring(0,7)
	})), [netWorthFlow, historyList, filteredInvestments, investmentHistoryType, investmentHistoryRange, displayCurrency, exchangeRate, allInvestments]);

	useEffect(() => {
		dispatch(getHistoryListAction());
		dispatch(getNetWorthFlowAction());
	}, [dispatch]);

	if (netWorthFlow.length > 0) {
		return (
			<React.Fragment>
				<Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
					<Stack direction="row" spacing={1} alignItems="center">
						<ChartControls />
						<InvestmentFilter
							allInvestments={allInvestments.map(i => i.name).sort()}
							filteredInvestments={filteredInvestments}
						/>
					</Stack>
				</Stack>
				{
					netWorthFlow.length > 1 &&
					<ResponsiveContainer width="100%" height={400}>
						<BarChart
							data={investmentHistory}
							margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
						>
							<XAxis dataKey="date" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
							<YAxis hide />
							<Tooltip content={<CustomTooltip />} />
							{
								filteredInvestments.map((i, index) => (
									<Bar
										key={i}
										dataKey={i}
										stackId="a"
										fill={stc(i)}
										radius={[4, 4, 4, 4]} />
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
