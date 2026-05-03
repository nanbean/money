import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import stc from 'string-to-color';

import InvestmentFilter from '../../components/InvestmentFilter';
import ChartControls from './ChartControls.js';

import useT from '../../hooks/useT';
import { sDisplay, fmtCurrency } from '../../utils/designTokens';

import {
	getHistoryListAction
} from '../../actions/couchdbActions';

import {
	getNetWorthFlowAction
} from '../../actions/couchdbReportActions';

const ChartTooltip = ({ active, payload, label, T, currency }) => {
	if (active && payload && payload.length) {
		return (
			<Box sx={{
				background: T.surf,
				padding: 1,
				border: `1px solid ${T.rule}`,
				borderRadius: '8px',
				minWidth: 180,
				maxHeight: 320,
				overflow: 'auto',
				boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
			}}>
				<Typography sx={{ fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 0.5 }}>{label}</Typography>
				{payload
					.filter(entry => entry.value > 0)
					.sort((a, b) => b.value - a.value)
					.map(entry => (
						<Stack key={entry.dataKey} direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ paddingY: '2px' }}>
							<Stack direction="row" spacing={0.5} alignItems="center">
								<Box sx={{ width: 8, height: 8, background: entry.fill, borderRadius: '2px', flexShrink: 0 }} />
								<Typography sx={{ fontSize: 11, color: T.ink2 }}>{entry.name}</Typography>
							</Stack>
							<Typography sx={{ fontSize: 11, color: T.ink }}>
								{fmtCurrency(entry.value, currency)}
							</Typography>
						</Stack>
					))}
			</Box>
		);
	}
	return null;
};

ChartTooltip.propTypes = {
	active: PropTypes.bool,
	currency: PropTypes.string,
	label: PropTypes.string,
	payload: PropTypes.array,
	T: PropTypes.object
};

function InvestmentHistory () {
	const T = useT();

	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const allInvestmentsPrice = useSelector((state) => state.allInvestmentsPrice);
	const filteredInvestments = useSelector((state) => state.filteredInvestments);
	const netWorthFlow = useSelector((state) => state.netWorthFlow);
	const historyList = useSelector((state) => state.historyList);
	const {
		currency: displayCurrency = 'KRW',
		exchangeRate,
		investmentHistoryRange = 'monthly',
		investmentHistoryType = 'quantity'
	} = useSelector((state) => state.settings);
	const dispatch = useDispatch();

	const allInvestments = useMemo(
		() => allInvestmentsPrice.filter(i => allAccountsTransactions.find(j => j.investment === i.name)),
		[allAccountsTransactions, allInvestmentsPrice]
	);

	const investmentHistory = useMemo(() => netWorthFlow.map(i => {
		const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate !== 0) ? exchangeRate : 1;
		const item = { date: i.date };
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
			if (year !== currentYear) return month === 12;
			return year === currentYear && month === currentMonth;
		}
		return true;
	}).map(item => ({
		...item,
		date: investmentHistoryRange === 'yearly' ? item.date.substring(0, 4) : item.date.substring(0, 7)
	})), [netWorthFlow, historyList, filteredInvestments, investmentHistoryType, investmentHistoryRange, displayCurrency, exchangeRate, allInvestments]);

	useEffect(() => {
		dispatch(getHistoryListAction());
		dispatch(getNetWorthFlowAction());
	}, [dispatch]);

	const panelSx = {
		background: T.surf,
		border: `1px solid ${T.rule}`,
		borderRadius: '16px',
		padding: { xs: '14px', md: '18px' },
		color: T.ink
	};

	if (netWorthFlow.length === 0) {
		return (
			<Box sx={panelSx}>
				<LinearProgress color="primary" sx={{ borderRadius: '4px' }} />
				<Typography sx={{ fontSize: 12, color: T.ink2, marginTop: 1 }}>Loading…</Typography>
			</Box>
		);
	}

	return (
		<Stack spacing={2}>
			{/* Header + filters panel */}
			<Box sx={panelSx}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
					<Box>
						<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 }}>
							Position history
							<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 보유내역</Box>
						</Typography>
						<Typography sx={{ fontSize: 12, color: T.ink2, marginTop: '4px' }}>
							{investmentHistoryRange === 'yearly' ? 'Yearly snapshot' : 'Monthly progression'} · {investmentHistoryType === 'amount' ? 'value' : 'quantity'}
						</Typography>
					</Box>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
						<ChartControls />
						<InvestmentFilter
							allInvestments={allInvestments.map(i => i.name).sort()}
							filteredInvestments={filteredInvestments}
						/>
					</Stack>
				</Stack>
			</Box>

			{/* Chart panel */}
			<Box sx={panelSx}>
				{netWorthFlow.length > 1 ? (
					<Box sx={{ width: '100%', height: { xs: 360, md: 460 } }}>
						<ResponsiveContainer>
							<BarChart
								data={investmentHistory}
								margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
							>
								<CartesianGrid vertical={false} stroke={T.rule} />
								<XAxis
									dataKey="date"
									tick={{ fontSize: 11, fill: T.ink2 }}
									axisLine={{ stroke: T.rule }}
									tickLine={false}
								/>
								<YAxis hide />
								<Tooltip
									content={<ChartTooltip T={T} currency={investmentHistoryType === 'amount' ? displayCurrency : ''} />}
									cursor={{ fill: T.surf2 }}
								/>
								{filteredInvestments.map((i) => (
									<Bar
										key={i}
										dataKey={i}
										stackId="a"
										fill={stc(i)}
										radius={[3, 3, 3, 3]}
										isAnimationActive={false}
									/>
								))}
							</BarChart>
						</ResponsiveContainer>
					</Box>
				) : (
					<Box sx={{ padding: 4, textAlign: 'center' }}>
						<Typography sx={{ fontSize: 13, color: T.ink2 }}>Not enough data points yet</Typography>
					</Box>
				)}
			</Box>

			{/* Legend panel */}
			{filteredInvestments.length > 0 && (
				<Box sx={panelSx}>
					<Typography sx={{ ...sDisplay, fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 1.25 }}>
						Holdings
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 종목 · {filteredInvestments.length}</Box>
					</Typography>
					<Box sx={{
						display: 'grid',
						gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
						gap: 1
					}}>
						{[...filteredInvestments].sort().map(name => (
							<Stack key={name} direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
								<Box sx={{ width: 10, height: 10, borderRadius: '3px', background: stc(name), flexShrink: 0 }} />
								<Typography sx={{
									fontSize: 12,
									color: T.ink,
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap'
								}}>
									{name}
								</Typography>
							</Stack>
						))}
					</Box>
				</Box>
			)}
		</Stack>
	);
}

export default InvestmentHistory;
