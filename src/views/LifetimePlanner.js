import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import {
	ResponsiveContainer, ComposedChart, BarChart, Bar, Line, Cell,
	XAxis, YAxis, Tooltip, ReferenceLine
} from 'recharts';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import DesignPage from '../components/DesignPage';
import SortMenuButton from '../components/SortMenuButton';

import useT from '../hooks/useT';
import { sDisplay, sMono, fmtCurrency } from '../utils/designTokens';

import { updateGeneralAction } from '../actions/couchdbSettingActions';
import { getLifetimeFlowAction } from '../actions/couchdbReportActions';

const TONES = {
	withInflation: '#10b981',
	base: '#3b82f6',
	pos: '#10b981',
	neg: '#ef4444',
	yearLine: '#9ca3af',
	incomeLine: '#10b981',
	expenseLine: '#f59e0b'
};

const eventColor = (type) => {
	if (type === 'income') return TONES.pos;
	if (type === 'expense') return TONES.expenseLine;
	return TONES.yearLine;
};

const YearEventLabel = ({ viewBox, value, fill }) => {
	if (!viewBox) return null;
	const { x, y } = viewBox;
	return (
		<g transform={`translate(${x},${y})`}>
			<text
				transform="rotate(-45)"
				x={0}
				y={0}
				dx={4}
				dy={-4}
				fontSize={9}
				fill={fill}
				textAnchor="start"
			>
				{value}
			</text>
		</g>
	);
};

YearEventLabel.propTypes = {
	fill: PropTypes.string,
	value: PropTypes.string,
	viewBox: PropTypes.object
};

const ChartTooltip = ({ active, payload, label, events, T, currency }) => {
	if (!active || !payload?.length) return null;
	const yearEvents = (events || []).filter(e => e.year === label);
	return (
		<Box sx={{
			background: T.surf,
			padding: 1,
			border: `1px solid ${T.rule}`,
			borderRadius: '8px',
			minWidth: 180,
			boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
		}}>
			<Typography sx={{ fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 0.5 }}>{label}</Typography>
			{[...payload].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).map(entry => (
				<Stack key={entry.dataKey} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
					<Stack direction="row" spacing={0.5} alignItems="center">
						<Box sx={{ width: 8, height: 8, background: entry.color || entry.fill, borderRadius: '2px' }} />
						<Typography sx={{ fontSize: 11, color: T.ink2 }}>{entry.name}</Typography>
					</Stack>
					<Typography sx={{ fontSize: 11, color: T.ink }}>{fmtCurrency(entry.value, currency)}</Typography>
				</Stack>
			))}
			{yearEvents.length > 0 && (
				<Box sx={{ marginTop: 0.75, paddingTop: 0.75, borderTop: `1px solid ${T.rule}` }}>
					{yearEvents.map((e, i) => (
						<Typography key={i} sx={{ fontSize: 10, color: T.ink2, display: 'block' }}>
							{e.type === 'income' ? '↑' : e.type === 'expense' ? '↓' : '●'} {e.label}{e.row ? ` (${e.row})` : ''}
						</Typography>
					))}
				</Box>
			)}
		</Box>
	);
};

ChartTooltip.propTypes = {
	active: PropTypes.bool,
	currency: PropTypes.string,
	events: PropTypes.array,
	label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	payload: PropTypes.array,
	T: PropTypes.object
};

function LifetimePlanner () {
	const T = useT();

	const { data: flowData = [], events = [] } = useSelector((state) => state.lifetimePlannerFlow);
	const {
		currency: displayCurrency = 'KRW',
		exchangeRate,
		lifetimePlannerChartType = 'both'
	} = useSelector((state) => state.settings);
	const [tableRange, setTableRange] = useState('20y');
	const [showDetail, setShowDetail] = useState(false);
	const dispatch = useDispatch();
	const currentYear = new Date().getFullYear();

	useEffect(() => {
		dispatch(getLifetimeFlowAction());
	}, [dispatch]);

	const flowDataWithCurrency = useMemo(() =>
		flowData.map(item => ({
			...item,
			amount: displayCurrency === 'USD' ? item.amount / exchangeRate : item.amount,
			amountInflation: displayCurrency === 'USD' ? item.amountInflation / exchangeRate : item.amountInflation,
			netFlow: displayCurrency === 'USD' ? (item.netFlow || 0) / exchangeRate : (item.netFlow || 0)
		})),
	[flowData, displayCurrency, exchangeRate]);

	const yearEvents = useMemo(() => events.filter(e => e.type === 'year'), [events]);
	const incomeEvents = useMemo(() => events.filter(e => e.type === 'income'), [events]);
	const expenseEvents = useMemo(() => events.filter(e => e.type === 'expense'), [events]);

	const tableData = useMemo(() => {
		const eventYears = new Set(events.map(e => e.year));
		return flowDataWithCurrency
			.filter(d => {
				if (tableRange === '20y' && d.year > currentYear + 20) return false;
				return d.year === currentYear || d.year % 5 === 0 || eventYears.has(d.year);
			})
			.map(d => ({ ...d, rowEvents: events.filter(e => e.year === d.year) }));
	}, [flowDataWithCurrency, events, tableRange, currentYear]);

	const summary = useMemo(() => {
		if (!flowDataWithCurrency.length) return null;
		const latest = flowDataWithCurrency[0];
		const peak = flowDataWithCurrency.reduce(
			(m, d) => (d.amount > m.amount ? d : m),
			flowDataWithCurrency[0]
		);
		const final = flowDataWithCurrency[flowDataWithCurrency.length - 1];
		const negativeYear = flowDataWithCurrency.find(d => d.amount < 0);
		return {
			currentValue: latest.amount,
			currentYear: latest.year,
			peakValue: peak.amount,
			peakYear: peak.year,
			finalValue: final.amount,
			finalYear: final.year,
			depleteYear: negativeYear?.year || null
		};
	}, [flowDataWithCurrency]);

	if (!flowData.length) {
		return <DesignPage title="Lifetime Planner" titleKo="평생계획" loading />;
	}

	const refStroke = {
		year:    { stroke: TONES.yearLine,    strokeDasharray: '6 3' },
		income:  { stroke: TONES.incomeLine,  strokeDasharray: '4 4' },
		expense: { stroke: TONES.expenseLine, strokeDasharray: '4 4' }
	};

	const panelSx = {
		background: T.surf,
		border: `1px solid ${T.rule}`,
		borderRadius: '16px',
		padding: { xs: '16px', md: '20px' },
		color: T.ink
	};

	const chipSx = (active) => ({
		padding: '6px 12px',
		fontSize: 11,
		fontWeight: 600,
		borderRadius: '999px',
		background: active ? T.acc.hero : 'transparent',
		color: active ? '#fff' : T.ink,
		border: active ? 'none' : `1px solid ${T.rule}`,
		cursor: 'pointer',
		transition: 'all 0.15s',
		whiteSpace: 'nowrap'
	});

	const heroBg = T.dark
		? 'linear-gradient(135deg, #15151c 0%, #1d1d26 100%)'
		: `linear-gradient(135deg, ${T.acc.hero} 0%, ${T.acc.deep} 100%)`;
	const heroInk = '#ffffff';
	const heroDim = T.dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)';
	const heroDivider = T.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)';

	const safe = summary && !summary.depleteYear;
	const statusBg = summary
		? (safe ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.22)')
		: 'transparent';
	const statusFg = summary
		? (safe ? '#34d399' : '#fb7185')
		: heroInk;
	const statusLabel = summary
		? (safe ? 'No depletion projected · 고갈 없음' : `Depletes ${summary.depleteYear} · ${summary.depleteYear - currentYear}y away`)
		: '';

	return (
		<DesignPage title="Lifetime Planner" titleKo="평생계획">
			<Stack spacing={2}>
				{/* Hero panel */}
				{summary && (
					<Box sx={{
						position: 'relative',
						overflow: 'hidden',
						background: heroBg,
						borderRadius: '20px',
						padding: { xs: '20px', md: '28px' },
						color: heroInk
					}}>
						<Box sx={{
							position: 'absolute',
							top: -100,
							right: -100,
							width: 360,
							height: 360,
							borderRadius: '50%',
							background: `radial-gradient(circle, ${T.acc.bright}55 0%, transparent 70%)`,
							pointerEvents: 'none'
						}}/>
						<Box sx={{ position: 'relative', minWidth: 0 }}>
							<Typography sx={{ fontSize: 11, color: heroDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
								Final value · 최종 자산 ({summary.finalYear})
							</Typography>
							<Typography sx={{
								...sDisplay,
								fontSize: { xs: 32, sm: 42, md: 52 },
								fontWeight: 700,
								lineHeight: 1,
								marginTop: '12px',
								color: summary.finalValue < 0 ? '#fb7185' : heroInk,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap'
							}}>
								{fmtCurrency(summary.finalValue, displayCurrency)}
							</Typography>
							<Box sx={{
								display: 'inline-flex',
								alignItems: 'center',
								marginTop: 1.5,
								padding: '4px 12px',
								borderRadius: '999px',
								background: statusBg,
								color: statusFg,
								fontSize: 12,
								fontWeight: 600,
								...sMono
							}}>
								{statusLabel}
							</Box>
						</Box>
						<Box sx={{
							display: 'grid',
							gridTemplateColumns: { xs: 'repeat(3, 1fr)' },
							gap: { xs: 1.5, md: 3 },
							marginTop: { xs: '20px', md: '28px' },
							position: 'relative'
						}}>
							{[
								{ label: 'Current · 현재', value: fmtCurrency(summary.currentValue, displayCurrency), sub: String(summary.currentYear), color: heroInk, divider: false },
								{ label: 'Peak · 최고점', value: fmtCurrency(summary.peakValue, displayCurrency), sub: String(summary.peakYear), color: '#34d399', divider: true },
								{ label: 'Years to peak · 도달', value: `${Math.max(0, summary.peakYear - currentYear)}y`, sub: summary.peakYear > currentYear ? 'ahead' : 'reached', color: heroInk, divider: true }
							].map((s) => (
								<Box key={s.label} sx={{
									borderLeft: { xs: 'none', md: s.divider ? `1px solid ${heroDivider}` : 'none' },
									paddingLeft: { xs: 0, md: s.divider ? '24px' : 0 },
									minWidth: 0
								}}>
									<Typography sx={{ fontSize: 11, color: heroDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
										{s.label}
									</Typography>
									<Typography sx={{
										...sDisplay,
										...sMono,
										fontSize: { xs: 16, md: 22 },
										fontWeight: 700,
										marginTop: '6px',
										color: s.color,
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap'
									}}>
										{s.value}
									</Typography>
									<Typography sx={{ ...sMono, fontSize: 11, color: heroDim, marginTop: '2px' }}>{s.sub}</Typography>
								</Box>
							))}
						</Box>
					</Box>
				)}

				{/* Net Worth chart */}
				<Box sx={panelSx}>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
						<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 }}>
							Net worth
							<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 순자산 추이</Box>
						</Typography>
						<SortMenuButton
							value={lifetimePlannerChartType}
							onChange={(v) => dispatch(updateGeneralAction('lifetimePlannerChartType', v))}
							options={[
								{ value: 'both', label: 'Both' },
								{ value: 'withInflation', label: 'With Inflation' },
								{ value: 'withoutInflation', label: 'Without Inflation' }
							]}
						/>
					</Stack>
					<Box sx={{ width: '100%', height: 320, '& svg': { overflow: 'visible' } }}>
						<ResponsiveContainer>
							<ComposedChart data={flowDataWithCurrency} margin={{ top: 80, right: 10, left: 10, bottom: 5 }}>
								<XAxis
									dataKey="year"
									tick={{ fontSize: 11, fill: T.ink2 }}
									axisLine={{ stroke: T.rule }}
									tickLine={false}
								/>
								<YAxis hide />
								<Tooltip content={<ChartTooltip events={events} T={T} currency={displayCurrency} />} cursor={{ fill: T.surf2 }} />
								{(lifetimePlannerChartType === 'withInflation' || lifetimePlannerChartType === 'both') && (
									<Bar dataKey="amount" name="With Inflation" fill={TONES.withInflation} radius={[2, 2, 0, 0]} />
								)}
								{lifetimePlannerChartType === 'withoutInflation' && (
									<Bar dataKey="amountInflation" name="Base" fill={TONES.base} radius={[2, 2, 0, 0]} />
								)}
								{lifetimePlannerChartType === 'both' && (
									<Line dataKey="amountInflation" name="Base" stroke={TONES.base} strokeDasharray="5 5" strokeWidth={2} dot={false} />
								)}
								{yearEvents.map(e => (
									<ReferenceLine key={`y-${e.year}`} x={e.year} {...refStroke.year}
										label={<YearEventLabel value={e.label} fill={T.ink2} />}
									/>
								))}
								{incomeEvents.map((e, i) => (
									<ReferenceLine key={`i-${i}`} x={e.year} {...refStroke.income} />
								))}
								{expenseEvents.map((e, i) => (
									<ReferenceLine key={`ex-${i}`} x={e.year} {...refStroke.expense} />
								))}
							</ComposedChart>
						</ResponsiveContainer>
					</Box>
				</Box>

				{/* Cash Flow chart */}
				<Box sx={panelSx}>
					<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0, marginBottom: 1.5 }}>
						Cash flow
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 현금 흐름</Box>
					</Typography>
					<Box sx={{ width: '100%', height: 220 }}>
						<ResponsiveContainer>
							<BarChart data={flowDataWithCurrency} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
								<XAxis
									dataKey="year"
									tick={{ fontSize: 11, fill: T.ink2 }}
									axisLine={{ stroke: T.rule }}
									tickLine={false}
								/>
								<YAxis hide />
								<Tooltip content={<ChartTooltip events={events} T={T} currency={displayCurrency} />} cursor={{ fill: T.surf2 }} />
								<ReferenceLine y={0} stroke={T.rule} />
								<Bar dataKey="netFlow" name="Cash flow" radius={[2, 2, 0, 0]}>
									{flowDataWithCurrency.map((entry, index) => (
										<Cell key={index} fill={entry.netFlow >= 0 ? TONES.pos : TONES.neg} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</Box>
				</Box>

				{/* Year detail */}
				<Box sx={panelSx}>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
						onClick={() => setShowDetail(v => !v)}
						sx={{ cursor: 'pointer', userSelect: 'none' }}
					>
						<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 }}>
							Year detail
							<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 연도별 상세</Box>
						</Typography>
						<Stack direction="row" alignItems="center" spacing={1} onClick={e => e.stopPropagation()}>
							{showDetail && (
								<Stack direction="row" spacing={0.5}>
									<Box onClick={() => setTableRange('20y')} sx={chipSx(tableRange === '20y')}>20Y</Box>
									<Box onClick={() => setTableRange('all')} sx={chipSx(tableRange === 'all')}>All</Box>
								</Stack>
							)}
							<IconButton size="small" sx={{
								color: T.ink2,
								transform: showDetail ? 'rotate(180deg)' : 'rotate(0deg)',
								transition: 'transform 0.2s'
							}}>
								<ExpandMoreIcon sx={{ fontSize: 18 }} />
							</IconButton>
						</Stack>
					</Stack>
					<Collapse in={showDetail}>
						<Box sx={{
							marginTop: 1.5,
							border: `1px solid ${T.rule}`,
							borderRadius: '12px',
							overflow: 'hidden'
						}}>
							<Box sx={{
								display: 'grid',
								gridTemplateColumns: '80px 1fr 1fr 2fr',
								gap: 1.25,
								padding: '10px 14px',
								background: T.dark ? '#15151c' : '#f5f5fa',
								fontSize: 11,
								color: T.ink2,
								fontWeight: 600,
								textTransform: 'uppercase',
								letterSpacing: '0.06em',
								borderBottom: `1px solid ${T.rule}`
							}}>
								<Box>Year</Box>
								<Box sx={{ textAlign: 'right' }}>Net worth</Box>
								<Box sx={{ textAlign: 'right' }}>Cash flow</Box>
								<Box>Events</Box>
							</Box>
							{tableData.map(row => (
								<Box
									key={row.year}
									sx={{
										display: 'grid',
										gridTemplateColumns: '80px 1fr 1fr 2fr',
										gap: 1.25,
										padding: '10px 14px',
										alignItems: 'center',
										background: row.rowEvents.length > 0
											? (T.dark ? 'rgba(255,255,255,0.02)' : T.surf2)
											: T.surf,
										borderTop: `1px solid ${T.rule}`,
										...(row.netFlow < 0 && { '& > *': { color: T.neg } })
									}}
								>
									<Typography sx={{ ...sMono, fontSize: 12, fontWeight: row.year === currentYear ? 700 : 600, color: T.ink }}>
										{row.year}
									</Typography>
									<Typography sx={{
										...sMono,
										fontSize: 12,
										fontWeight: 600,
										textAlign: 'right',
										color: row.amount < 0 ? T.neg : T.ink
									}}>
										{fmtCurrency(Math.round(row.amount), displayCurrency)}
									</Typography>
									<Typography sx={{
										...sMono,
										fontSize: 12,
										fontWeight: 600,
										textAlign: 'right',
										color: row.netFlow >= 0 ? T.pos : T.neg
									}}>
										{row.netFlow >= 0 ? '+' : '−'}{fmtCurrency(Math.abs(Math.round(row.netFlow)), displayCurrency)}
									</Typography>
									<Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
										{row.rowEvents.map((e, i) => (
											<Box
												key={i}
												sx={{
													display: 'inline-flex',
													alignItems: 'center',
													gap: 0.5,
													padding: '2px 8px',
													borderRadius: '999px',
													background: `${eventColor(e.type)}22`,
													color: eventColor(e.type),
													fontSize: 10,
													fontWeight: 600,
													whiteSpace: 'nowrap'
												}}
											>
												<Box sx={{ width: 4, height: 4, borderRadius: '2px', background: eventColor(e.type) }} />
												{e.label}{e.row ? ` (${e.row})` : ''}
											</Box>
										))}
									</Stack>
								</Box>
							))}
						</Box>
					</Collapse>
				</Box>
			</Stack>
		</DesignPage>
	);
}

export default LifetimePlanner;
