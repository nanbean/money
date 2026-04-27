import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import _ from 'lodash';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

import ReportGrid from '../../components/ReportGrid';
import AccountFilter from '../../components/AccountFilter';

import useT from '../../hooks/useT';
import { sDisplay, sMono, labelStyle, fmtCurrency, colorFor } from '../../utils/designTokens';

import {
	getHistoryListAction
} from '../../actions/couchdbActions';

import useReturnReport from './useReturnReport';

const ChartTooltip = ({ active, payload, label, T }) => {
	if (active && payload && payload.length) {
		return (
			<Box sx={{
				background: T.surf,
				padding: 1,
				border: `1px solid ${T.rule}`,
				borderRadius: '8px',
				minWidth: 150,
				boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
			}}>
				<Typography sx={{ fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 0.5 }}>
					{label && label.substring(0, 4)}
				</Typography>
				<Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
					<Typography sx={{ fontSize: 11, color: T.ink2 }}>{payload[0].name}:</Typography>
					<Typography sx={{ ...sMono, fontSize: 11, color: T.ink }}>{(payload[0].value * 100).toFixed(1)}%</Typography>
				</Stack>
			</Box>
		);
	}
	return null;
};

ChartTooltip.propTypes = {
	active: PropTypes.bool,
	label: PropTypes.string,
	payload: PropTypes.array,
	T: PropTypes.object
};

function StatCard ({ label, value, color, T }) {
	const lab = labelStyle(T);
	return (
		<Box sx={{
			background: T.surf,
			border: `1px solid ${T.rule}`,
			borderRadius: '12px',
			padding: { xs: '12px', md: '14px' },
			minWidth: 0
		}}>
			<Typography sx={lab}>{label}</Typography>
			<Typography sx={{
				...sMono,
				fontSize: 16,
				fontWeight: 700,
				marginTop: '4px',
				color: color || T.ink,
				whiteSpace: 'nowrap',
				overflow: 'hidden',
				textOverflow: 'ellipsis'
			}}>
				{value}
			</Typography>
		</Box>
	);
}

StatCard.propTypes = {
	color: PropTypes.string,
	label: PropTypes.string,
	T: PropTypes.object,
	value: PropTypes.string
};

export function RateOfReturn () {
	const T = useT();

	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { exchangeRate, currency = 'KRW' } = useSelector((state) => state.settings);
	const accountList = useSelector((state) => state.accountList);
	const investementTransactions = allAccountsTransactions.filter(i => i.accountId?.split(':')[1] === 'Invst');
	const cashTransactions = allAccountsTransactions.filter(i => i.accountId?.split(':')[2]?.match(/_Cash/));
	const allInvestments = useSelector((state) => state.allInvestments);
	const historyList = useSelector((state) => state.historyList);
	const allInvestmentAccounts = Object.keys(_.groupBy(investementTransactions, 'account')).map(account => account);
	const [filteredAccounts, setFilteredAccounts] = useState(allInvestmentAccounts);
	const allCashAccounts = Object.keys(_.groupBy(cashTransactions, 'account')).map(account => account).filter(i => i && filteredAccounts.includes(i.split('_')[0]));
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(getHistoryListAction());
	}, [dispatch]);

	const onFilteredAccountsChange = (e) => setFilteredAccounts(e);

	const { reportData, chartData, geometricMean, overallSummary } = useReturnReport(
		allInvestments, allAccountsTransactions, investementTransactions, cashTransactions,
		historyList, filteredAccounts, allCashAccounts, accountList, exchangeRate
	);

	const panelSx = {
		background: T.surf,
		border: `1px solid ${T.rule}`,
		borderRadius: '16px',
		padding: { xs: '14px', md: '18px' },
		color: T.ink
	};

	return (
		<Stack
			spacing={2}
			sx={{
				flex: 1,
				height: { xs: 'auto', md: 'calc(100vh - 140px)' },
				minHeight: { xs: 720, md: 'calc(100vh - 140px)' },
				display: 'flex',
				flexDirection: 'column'
			}}
		>
			{/* Header + filter */}
			<Box sx={panelSx}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
					<Box>
						<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 }}>
							Rate of return
							<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 수익률</Box>
						</Typography>
						{overallSummary && (
							<Typography sx={{ fontSize: 12, color: T.ink2, marginTop: '4px' }}>
								Geometric mean&nbsp;
								<Box component="span" sx={{ ...sMono, fontWeight: 700, color: colorFor(T, geometricMean - 1) }}>
									{`${((geometricMean - 1) * 100).toFixed(3)}%`}
								</Box>
							</Typography>
						)}
					</Box>
					<AccountFilter
						allAccounts={allInvestmentAccounts}
						filteredAccounts={filteredAccounts}
						setfilteredAccounts={onFilteredAccountsChange}
					/>
				</Stack>
			</Box>

			{/* Stat cards (4 metrics) */}
			{overallSummary && (
				<Box sx={{
					display: 'grid',
					gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
					gap: 2
				}}>
					<StatCard
						label="Final value · 평가액"
						value={fmtCurrency(overallSummary.finalValue, currency)}
						T={T}
					/>
					<StatCard
						label="Final cash · 현금"
						value={fmtCurrency(overallSummary.finalCash, currency)}
						T={T}
					/>
					<StatCard
						label="Total cash flow · 현금 흐름"
						value={fmtCurrency(overallSummary.totalCashFlow, currency)}
						color={colorFor(T, overallSummary.totalCashFlow)}
						T={T}
					/>
					<StatCard
						label="Capital gains · 자본 손익"
						value={fmtCurrency(overallSummary.capitalGains, currency)}
						color={colorFor(T, overallSummary.capitalGains)}
						T={T}
					/>
				</Box>
			)}

			{/* Chart panel */}
			<Box sx={panelSx}>
				<Typography sx={{ ...sDisplay, fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 1 }}>
					Cumulative return
					<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 누적 수익률</Box>
				</Typography>
				<Box sx={{ width: '100%', height: 200 }}>
					<ResponsiveContainer>
						<LineChart data={chartData}>
							<XAxis
								dataKey="date"
								tickFormatter={(tick) => tick.substring(0, 4)}
								tick={{ fontSize: 11, fill: T.ink2 }}
								axisLine={{ stroke: T.rule }}
								tickLine={false}
							/>
							<YAxis
								tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`}
								tick={{ fontSize: 11, fill: T.ink2 }}
								axisLine={{ stroke: T.rule }}
								tickLine={false}
							/>
							<Tooltip content={<ChartTooltip T={T} />} />
							<Line
								type="monotone"
								dataKey="cumulativeReturn"
								name="Cumulative Return"
								stroke={T.acc.hero}
								strokeWidth={2}
								dot={{ r: 3, fill: T.acc.hero }}
								activeDot={{ r: 5, fill: T.acc.hero }}
							/>
						</LineChart>
					</ResponsiveContainer>
				</Box>
			</Box>

			{/* Report grid panel — fills remaining vertical space */}
			<Box sx={{
				...panelSx,
				flex: 1,
				display: 'flex',
				flexDirection: 'column',
				minHeight: { xs: 480, md: 0 },
				padding: 0,
				overflow: 'hidden'
			}}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ padding: { xs: '14px 14px 8px', md: '18px 18px 10px' } }}>
					<Typography sx={{ ...sDisplay, fontSize: 14, fontWeight: 700, color: T.ink, margin: 0 }}>
						Yearly breakdown
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 연도별 내역</Box>
					</Typography>
					{reportData.length > 0 && (
						<Typography sx={{ fontSize: 11, color: T.ink3 }}>{reportData.length - 1} rows</Typography>
					)}
				</Stack>
				<Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
					{reportData.length > 0 ? (
						<ReportGrid reportData={reportData} />
					) : (
						<Box sx={{ padding: 4, textAlign: 'center' }}>
							<Typography sx={{ fontSize: 13, color: T.ink2 }}>No return data yet</Typography>
						</Box>
					)}
				</Box>
			</Box>
		</Stack>
	);
}

export default RateOfReturn;
