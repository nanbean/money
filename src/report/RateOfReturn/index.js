import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import _ from 'lodash';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

import ReturnYearlyTable from './YearlyTable';
import AccountFilter from '../../components/AccountFilter';

import useT from '../../hooks/useT';
import { sDisplay, sMono, fmtCurrency } from '../../utils/designTokens';

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
	const [filteredAccountsTouched, setFilteredAccountsTouched] = useState(false);
	const allCashAccounts = Object.keys(_.groupBy(cashTransactions, 'account')).map(account => account).filter(i => i && filteredAccounts.includes(i.split('_')[0]));
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(getHistoryListAction());
	}, [dispatch]);

	// useState's initial value is captured on first render, but Redux data may
	// load afterwards or new investment accounts may appear over time. Sync
	// filteredAccounts with allInvestmentAccounts until the user touches it.
	useEffect(() => {
		if (filteredAccountsTouched) return;
		const next = allInvestmentAccounts;
		const same = next.length === filteredAccounts.length && next.every(a => filteredAccounts.includes(a));
		if (!same) setFilteredAccounts(next);
	}, [allInvestmentAccounts, filteredAccounts, filteredAccountsTouched]);

	const onFilteredAccountsChange = (e) => {
		setFilteredAccountsTouched(true);
		setFilteredAccounts(e);
	};

	const { chartData, geometricMean, overallSummary } = useReturnReport(
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

	const heroBg = T.dark
		? 'linear-gradient(135deg, #15151c 0%, #1d1d26 100%)'
		: `linear-gradient(135deg, ${T.acc.hero} 0%, ${T.acc.deep} 100%)`;
	const heroInk = '#ffffff';
	const heroDim = T.dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)';
	const heroDivider = T.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)';
	const heroPos = '#34d399';
	const heroNeg = '#fb7185';
	const meanPct = geometricMean ? (geometricMean - 1) * 100 : 0;
	const meanColor = meanPct > 0 ? heroPos : meanPct < 0 ? heroNeg : heroInk;

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
			{/* Hero — Rate of return + 4 grand-total metrics */}
			<Box sx={{
				position: 'relative',
				overflow: 'hidden',
				background: heroBg,
				borderRadius: { xs: '16px', md: '20px' },
				padding: { xs: '20px', md: '24px' },
				color: heroInk
			}}>
				<Box sx={{
					position: 'absolute', top: -100, right: -100,
					width: 360, height: 360, borderRadius: '50%',
					background: `radial-gradient(circle, ${T.acc.bright}55 0%, transparent 70%)`,
					pointerEvents: 'none'
				}}/>
				<Stack
					direction={{ xs: 'column', md: 'row' }}
					justifyContent="space-between"
					alignItems={{ xs: 'flex-start', md: 'flex-start' }}
					spacing={2}
					sx={{ position: 'relative' }}
				>
					<Box sx={{ minWidth: 0 }}>
						<Typography sx={{ fontSize: 11, color: heroDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
							Rate of return · 수익률
						</Typography>
						{overallSummary && (
							<>
								<Typography sx={{
									...sDisplay,
									...sMono,
									fontSize: { xs: 32, sm: 40, md: 52 },
									fontWeight: 700,
									lineHeight: 1,
									marginTop: '12px',
									color: meanColor
								}}>
									{meanPct >= 0 ? '+' : ''}{meanPct.toFixed(3)}%
								</Typography>
								<Typography sx={{ fontSize: 12, color: heroDim, marginTop: '6px' }}>
									Geometric mean across {chartData.length - 1 || 0} years
								</Typography>
							</>
						)}
					</Box>
					<AccountFilter
						allAccounts={allInvestmentAccounts}
						filteredAccounts={filteredAccounts}
						setfilteredAccounts={onFilteredAccountsChange}
					/>
				</Stack>
				{overallSummary && (
					<Box sx={{
						display: 'grid',
						gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
						gap: { xs: 1.5, md: 3 },
						marginTop: { xs: '20px', md: '28px' },
						position: 'relative'
					}}>
						{[
							{ label: 'Final value · 평가액', value: fmtCurrency(overallSummary.finalValue, currency), color: heroInk, divider: false },
							{ label: 'Final cash · 현금', value: fmtCurrency(overallSummary.finalCash, currency), color: heroInk, divider: true },
							{ label: 'Total cash flow · 현금 흐름', value: fmtCurrency(overallSummary.totalCashFlow, currency), color: overallSummary.totalCashFlow > 0 ? heroPos : overallSummary.totalCashFlow < 0 ? heroNeg : heroInk, divider: true },
							{ label: 'Capital gains · 자본 손익', value: fmtCurrency(overallSummary.capitalGains, currency), color: overallSummary.capitalGains > 0 ? heroPos : overallSummary.capitalGains < 0 ? heroNeg : heroInk, divider: true }
						].map(item => (
							<Box key={item.label} sx={{
								borderLeft: { xs: 'none', md: item.divider ? `1px solid ${heroDivider}` : 'none' },
								paddingLeft: { xs: 0, md: item.divider ? '20px' : 0 },
								minWidth: 0
							}}>
								<Typography sx={{
									fontSize: 11,
									color: heroDim,
									textTransform: 'uppercase',
									letterSpacing: '0.06em',
									fontWeight: 500,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis'
								}}>
									{item.label}
								</Typography>
								<Typography sx={{
									...sDisplay,
									...sMono,
									fontSize: { xs: 16, md: 20 },
									fontWeight: 700,
									marginTop: '4px',
									color: item.color,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis'
								}}>
									{item.value}
								</Typography>
							</Box>
						))}
					</Box>
				)}
			</Box>

			{/* Chart panel */}
			<Box sx={panelSx}>
				<Typography sx={{ ...sDisplay, fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 1 }}>
					Cumulative return
					<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 누적 수익률</Box>
				</Typography>
				<Box sx={{ width: '100%', height: { xs: 220, md: 260 } }}>
					<ResponsiveContainer>
						<LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
							<CartesianGrid vertical={false} stroke={T.rule} />
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
							<Tooltip content={<ChartTooltip T={T} />} cursor={{ stroke: T.rule, strokeWidth: 1 }} />
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

			{/* Yearly table panel — fills remaining vertical space (desktop) or
			    takes natural height (mobile) so the inner 600px table wrapper
			    isn't clipped by an outer flex:1 panel. */}
			<Box sx={{
				...panelSx,
				flex: { xs: '0 0 auto', md: 1 },
				display: 'flex',
				flexDirection: 'column',
				minHeight: { xs: 'auto', md: 0 },
				padding: 0,
				overflow: { xs: 'visible', md: 'hidden' }
			}}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ padding: { xs: '14px 14px 8px', md: '18px 18px 10px' } }}>
					<Typography sx={{ ...sDisplay, fontSize: 14, fontWeight: 700, color: T.ink, margin: 0 }}>
						Yearly breakdown
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 연도별 내역</Box>
					</Typography>
					{chartData.length > 0 && (
						<Typography sx={{ fontSize: 11, color: T.ink3 }}>{chartData.length} rows</Typography>
					)}
				</Stack>
				<Box sx={{
					// Mobile: drop flex (its `1 1 0%` resets flex-basis and lets the
					// native table grow to its full content height). Pin a fixed pixel
					// height so the table's maxHeight:100% can confine the scroll.
					flex: { md: 1 },
					minHeight: { md: 0 },
					position: 'relative',
					height: { xs: 600, md: 'auto' }
				}}>
					{chartData.length > 0 ? (
						<ReturnYearlyTable rows={chartData} />
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
