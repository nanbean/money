import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import DesignPage from '../components/DesignPage';
import SortMenuButton from '../components/SortMenuButton';

import useT from '../hooks/useT';
import { sDisplay, sMono, labelStyle, fmtCurrency, colorFor } from '../utils/designTokens';

import {
	updateGeneralAction
} from '../actions/couchdbSettingActions';
import {
	getNetWorthFlowAction
} from '../actions/couchdbReportActions';

import {
	calcSavingsScore,
	calcInvestmentScore,
	calcEmergencyScore,
	calcDebtScore,
	toDisplay,
	isInternalTransfer
} from '../home/FinancialHealthScore/utils';

import moment from 'moment';

// Color palette (dedicated semantics — distinct from accent)
const ASSET_TONES = ['#10b981', '#3b82f6', '#f59e0b', '#a78bfa']; // bank/cash/invst/realestate
const LIAB_TONE = '#ef4444';

const ChartTooltip = ({ active, payload, label, T, currency }) => {
	if (active && payload && payload.length) {
		return (
			<Box sx={{
				background: T.surf,
				padding: 1,
				border: `1px solid ${T.rule}`,
				borderRadius: '8px',
				minWidth: 160,
				boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
			}}>
				<Typography sx={{ fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 0.5 }}>{label}</Typography>
				{payload
					.filter(entry => Number.isFinite(entry.value))
					.sort((a, b) => b.value - a.value)
					.map(entry => (
						<Stack key={entry.dataKey} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
							<Stack direction="row" spacing={0.5} alignItems="center">
								<Box sx={{ width: 8, height: 8, background: entry.color || entry.fill, borderRadius: '2px' }} />
								<Typography sx={{ fontSize: 11, color: T.ink2 }}>{entry.name}</Typography>
							</Stack>
							<Typography sx={{ fontSize: 11, color: T.ink }}>{fmtCurrency(entry.value, currency)}</Typography>
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

const grade = (score) => {
	if (score >= 85) return { label: '최우수', color: '#10b981' };
	if (score >= 70) return { label: '좋음', color: '#10b981' };
	if (score >= 50) return { label: '보통', color: '#f59e0b' };
	if (score >= 30) return { label: '주의', color: '#f59e0b' };
	return { label: '위험', color: '#ef4444' };
};

function MetricBar ({ label, score, max, detail, T }) {
	const pctVal = Math.min(100, Math.max(0, (score / max) * 100));
	return (
		<Box>
			<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ marginBottom: '6px' }}>
				<Typography sx={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{label}</Typography>
				<Typography sx={{ ...sMono, fontSize: 11, color: T.ink2 }}>{score}/{max}</Typography>
			</Stack>
			<Box sx={{ height: 6, background: T.dark ? T.rule : T.surf2, borderRadius: '3px', overflow: 'hidden' }}>
				<Box sx={{ height: '100%', width: `${pctVal}%`, background: T.acc.hero, transition: 'width 0.2s' }} />
			</Box>
			{detail && (
				<Typography sx={{ fontSize: 10, color: T.ink3, marginTop: '6px' }}>{detail}</Typography>
			)}
		</Box>
	);
}

MetricBar.propTypes = {
	detail: PropTypes.string,
	label: PropTypes.string,
	max: PropTypes.number,
	score: PropTypes.number,
	T: PropTypes.object
};

function NetWorth () {
	const T = useT();
	const lab = labelStyle(T);
	const dispatch = useDispatch();

	const netWorthFlow = useSelector((state) => state.netWorthFlow);
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const {
		currency: displayCurrency = 'KRW',
		exchangeRate,
		netWorthChartRange = 'monthly',
		livingExpenseExempt = []
	} = useSelector((state) => state.settings);

	useEffect(() => {
		dispatch(getNetWorthFlowAction());
	}, [dispatch]);

	const handleRangeChange = (newRange) => dispatch(updateGeneralAction('netWorthChartRange', newRange));

	const rangedNetWorthFlow = useMemo(() => netWorthFlow.filter(item => {
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear();
		const currentMonth = currentDate.getMonth() + 1;
		if (netWorthChartRange === 'yearly') {
			const date = new Date(item.date);
			const month = date.getMonth() + 1;
			const year = date.getFullYear();
			if (year !== currentYear) return month === 12;
			return year === currentYear && month === currentMonth;
		}
		return true;
	}).map(item => ({
		...item,
		date: netWorthChartRange === 'yearly' ? item.date.substring(0, 4) : item.date.substring(0, 7)
	})).map(item => ({
		...item,
		assetNetWorth: displayCurrency === 'USD' ? item.assetNetWorth / exchangeRate : item.assetNetWorth,
		investmentsNetWorth: displayCurrency === 'USD' ? item.investmentsNetWorth / exchangeRate : item.investmentsNetWorth,
		cashNetWorth: displayCurrency === 'USD' ? item.cashNetWorth / exchangeRate : item.cashNetWorth,
		netWorth: displayCurrency === 'USD' ? item.netWorth / exchangeRate : item.netWorth
	})), [netWorthFlow, netWorthChartRange, displayCurrency, exchangeRate]);

	// Current breakdown from accountList for the right-now snapshot
	const breakdown = useMemo(() => {
		const list = (accountList || []).filter(a => !a.closed && !a.name.match(/_Cash/i));
		const groupBy = (predicate) => list
			.filter(predicate)
			.reduce((s, a) => s + toDisplay(a, exchangeRate, displayCurrency), 0);
		const bank = groupBy(a => a.type === 'Bank');
		const cash = groupBy(a => a.type === 'Cash');
		const ccard = groupBy(a => a.type === 'CCard');
		const invst = groupBy(a => a.type === 'Invst');
		const realEstate = groupBy(a => a.type === 'Oth A');
		const liabOther = groupBy(a => a.type === 'Oth L');
		const liquid = bank + cash + ccard;
		const assets = liquid + invst + realEstate;
		const liabilities = Math.abs(liabOther);
		const netWorth = assets + liabOther;
		return { bank, cash, ccard, invst, realEstate, liabOther, liquid, assets, liabilities, netWorth };
	}, [accountList, exchangeRate, displayCurrency]);

	// 30-day delta (last 2 entries of monthly netWorthFlow)
	const monthDelta = useMemo(() => {
		if (!netWorthFlow || netWorthFlow.length < 2) return null;
		const conv = (n) => displayCurrency === 'USD' ? n / exchangeRate : n;
		const latest = netWorthFlow[netWorthFlow.length - 1];
		const prev = netWorthFlow[netWorthFlow.length - 2];
		if (!latest?.netWorth || !prev?.netWorth) return null;
		const diff = conv(latest.netWorth) - conv(prev.netWorth);
		const pctChange = prev.netWorth ? (diff / Math.abs(prev.netWorth)) * 100 : 0;
		return { diff, pct: pctChange };
	}, [netWorthFlow, displayCurrency, exchangeRate]);

	// Financial health (ported from home/FinancialHealthScore)
	const fhScore = useMemo(() => {
		if (!accountList || accountList.length === 0) return null;
		const savings = calcSavingsScore(allAccountsTransactions || [], livingExpenseExempt);
		const investing = calcInvestmentScore(accountList, exchangeRate, displayCurrency);
		const emergency = calcEmergencyScore(accountList, allAccountsTransactions || [], exchangeRate, displayCurrency);
		const debt = calcDebtScore(accountList, exchangeRate, displayCurrency);
		return { savings, investing, emergency, debt, total: savings + investing + emergency + debt };
	}, [accountList, allAccountsTransactions, exchangeRate, displayCurrency, livingExpenseExempt]);

	// Detailed metrics (income/expense/ratio numbers for the bar tooltips)
	const fhDetails = useMemo(() => {
		if (!accountList || accountList.length === 0) return null;
		const threeMonthsAgo = moment().subtract(3, 'months').format('YYYY-MM-DD');
		const lastMonthEnd = moment().subtract(1, 'months').endOf('month').format('YYYY-MM-DD');
		const sym = displayCurrency === 'USD' ? '$' : '₩';
		const fmt = (n) => Math.round(n).toLocaleString();

		const pastTxns = (allAccountsTransactions || []).filter(t => t.date >= threeMonthsAgo && t.date <= lastMonthEnd);
		const income = pastTxns.filter(t => t.amount > 0 && !isInternalTransfer(t)).reduce((s, t) => s + t.amount, 0);
		const expense = pastTxns
			.filter(t => t.amount < 0 && !livingExpenseExempt.some(e => t.category?.startsWith(e)))
			.reduce((s, t) => s + Math.abs(t.amount), 0);
		const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

		const totalNet = accountList
			.filter(a => !a.closed && !a.name.match(/_Cash/i))
			.reduce((s, a) => s + toDisplay(a, exchangeRate, displayCurrency), 0);
		const invTotal = accountList
			.filter(a => !a.closed && !a.name.match(/_Cash/i) && a.type === 'Invst')
			.reduce((s, a) => s + toDisplay(a, exchangeRate, displayCurrency), 0);
		const invRatio = totalNet > 0 ? (invTotal / totalNet) * 100 : 0;

		const accountMap = new Map(accountList.map(a => [a._id, a]));
		const toTxDisplay = (t) => {
			const acc = accountMap.get(t.accountId);
			const cur = acc?.currency || 'KRW';
			const abs = Math.abs(t.amount);
			if (cur === displayCurrency) return abs;
			return displayCurrency === 'KRW' ? abs * exchangeRate : abs / exchangeRate;
		};
		const liquidAssets = accountList
			.filter(a => !a.closed && (a.type === 'Bank' || a.type === 'Cash') && !a.name.match(/_Cash/i))
			.reduce((s, a) => s + toDisplay(a, exchangeRate, displayCurrency), 0);
		const expenseTxns = (allAccountsTransactions || []).filter(t =>
			t.date >= threeMonthsAgo && t.amount < 0 && !isInternalTransfer(t)
		);
		const monthsWithData = new Set(expenseTxns.map(t => t.date.slice(0, 7))).size;
		const monthlyAvg = monthsWithData > 0
			? expenseTxns.reduce((s, t) => s + toTxDisplay(t), 0) / monthsWithData
			: 0;
		const liquidMonths = monthlyAvg > 0 ? liquidAssets / monthlyAvg : 0;

		const assetTotal = accountList
			.filter(a => !a.closed && !a.name.match(/_Cash/i) && a.type !== 'Oth L')
			.reduce((s, a) => s + toDisplay(a, exchangeRate, displayCurrency), 0);
		const debtTotal = accountList
			.filter(a => !a.closed && !a.name.match(/_Cash/i) && a.type === 'Oth L')
			.reduce((s, a) => s + Math.abs(toDisplay(a, exchangeRate, displayCurrency)), 0);
		const debtRatio = assetTotal > 0 ? (debtTotal / assetTotal) * 100 : 0;

		return {
			savings: income > 0
				? `최근 3개월 수입 ${sym}${fmt(income)} · 지출 ${sym}${fmt(expense)} → 저축률 ${savingsRate.toFixed(1)}%`
				: '수입 데이터 없음',
			investing: `투자 ${sym}${fmt(invTotal)} / 순자산 ${sym}${fmt(totalNet)} = ${invRatio.toFixed(1)}%`,
			emergency: monthlyAvg > 0
				? `유동자산 ${sym}${fmt(liquidAssets)} / 월평균지출 ${sym}${fmt(monthlyAvg)} = ${liquidMonths.toFixed(1)}개월분`
				: '지출 데이터 없음',
			debt: `부채 ${sym}${fmt(debtTotal)} / 자산 ${sym}${fmt(assetTotal)} = ${debtRatio.toFixed(1)}%`
		};
	}, [accountList, allAccountsTransactions, exchangeRate, displayCurrency, livingExpenseExempt]);

	// Composition donut data (current snapshot)
	const compositionData = useMemo(() => {
		const items = [
			{ name: 'Liquid', value: breakdown.liquid, color: ASSET_TONES[0] },
			{ name: 'Investments', value: breakdown.invst, color: ASSET_TONES[1] },
			{ name: 'Real estate', value: breakdown.realEstate, color: ASSET_TONES[2] }
		].filter(d => Math.abs(d.value) > 0);
		return items;
	}, [breakdown]);

	const totalAssetsValue = compositionData.reduce((s, d) => s + d.value, 0);

	const panelSx = {
		background: T.surf,
		border: `1px solid ${T.rule}`,
		borderRadius: '16px',
		padding: { xs: '16px', md: '20px' },
		color: T.ink
	};

	const heroBg = T.dark
		? 'linear-gradient(135deg, #15151c 0%, #1d1d26 100%)'
		: `linear-gradient(135deg, ${T.acc.hero} 0%, #5b4fd8 100%)`;
	const heroInk = '#ffffff';
	const heroDim = T.dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)';

	if (rangedNetWorthFlow.length === 0 && !breakdown.netWorth) {
		return <DesignPage title="Net Worth" titleKo="순자산" loading />;
	}

	const fh = fhScore ? fhScore.total : 0;
	const fhGrade = grade(fh);

	return (
		<DesignPage title="Net Worth" titleKo="순자산">
			<Stack spacing={2}>
				{/* Hero panel */}
				<Box sx={{
					position: 'relative',
					overflow: 'hidden',
					background: heroBg,
					borderRadius: '20px',
					padding: { xs: '24px', md: '32px' },
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
					<Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-start' }} spacing={2} sx={{ position: 'relative' }}>
						<Box sx={{ minWidth: 0 }}>
							<Typography sx={{ fontSize: 11, color: heroDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
								Net worth · 순자산
							</Typography>
							<Typography sx={{
								...sDisplay,
								fontSize: { xs: 36, sm: 48, md: 60 },
								fontWeight: 700,
								lineHeight: 1,
								marginTop: '14px',
								color: breakdown.netWorth < 0 ? '#fb7185' : heroInk
							}}>
								{fmtCurrency(breakdown.netWorth, displayCurrency)}
							</Typography>
							{monthDelta && (
								<Stack direction="row" spacing={1.25} alignItems="center" sx={{ marginTop: 1.5, flexWrap: 'wrap', rowGap: 0.5 }}>
									<Box sx={{
										color: monthDelta.diff >= 0 ? T.pos : T.neg,
										background: monthDelta.diff >= 0 ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)',
										padding: '4px 10px',
										borderRadius: '999px',
										fontWeight: 600,
										fontSize: 13,
										...sMono
									}}>
										{monthDelta.diff >= 0 ? '+' : ''}{monthDelta.pct.toFixed(2)}%
									</Box>
									<Typography sx={{ ...sMono, color: heroDim, fontSize: 13 }}>
										{monthDelta.diff >= 0 ? '+' : '−'}
										{fmtCurrency(Math.abs(monthDelta.diff), displayCurrency)} past month
									</Typography>
								</Stack>
							)}
						</Box>
						<SortMenuButton
							value={netWorthChartRange}
							onChange={handleRangeChange}
							options={[
								{ value: 'monthly', label: 'Monthly' },
								{ value: 'yearly', label: 'Yearly' }
							]}
						/>
					</Stack>
					<Box sx={{
						display: 'grid',
						gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
						gap: { xs: 2, md: 3 },
						marginTop: { xs: '24px', md: '32px' },
						position: 'relative'
					}}>
						{[
							{ label: 'Liquid · 유동자산', value: breakdown.liquid, divider: false },
							{ label: 'Investments · 투자', value: breakdown.invst, divider: true },
							{ label: 'Real estate · 부동산', value: breakdown.realEstate, divider: true },
							{ label: 'Liabilities · 부채', value: breakdown.liabOther, divider: true }
						].map((s) => (
							<Box key={s.label} sx={{
								borderLeft: s.divider ? `1px solid ${T.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)'}` : 'none',
								paddingLeft: s.divider ? '24px' : 0,
								minWidth: 0
							}}>
								<Typography sx={{
									fontSize: 11,
									color: heroDim,
									textTransform: 'uppercase',
									letterSpacing: '0.08em',
									fontWeight: 500
								}}>
									{s.label}
								</Typography>
								<Typography sx={{
									...sDisplay,
									fontSize: { xs: 18, md: 24 },
									fontWeight: 600,
									color: '#fff',
									marginTop: '8px',
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis'
								}}>
									{fmtCurrency(s.value, displayCurrency)}
								</Typography>
							</Box>
						))}
					</Box>
				</Box>

				{/* Net worth trend chart */}
				<Box sx={panelSx}>
					<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ marginBottom: 1.5 }}>
						<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 }}>
							Trend
							<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 추이</Box>
						</Typography>
						<Typography sx={{ fontSize: 11, color: T.ink3 }}>
							{netWorthChartRange === 'yearly' ? 'Year-end snapshots' : 'Monthly progression'}
						</Typography>
					</Stack>
					{rangedNetWorthFlow.length > 1 ? (
						<Box sx={{ width: '100%', height: 360 }}>
							<ResponsiveContainer>
								<ComposedChart
									data={rangedNetWorthFlow}
									margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
								>
									<XAxis
										dataKey="date"
										tick={{ fontSize: 11, fill: T.ink2 }}
										axisLine={{ stroke: T.rule }}
										tickLine={false}
									/>
									<YAxis hide />
									<Tooltip content={<ChartTooltip T={T} currency={displayCurrency} />} cursor={{ fill: T.surf2 }} />
									<Bar dataKey="cashNetWorth" name="Cash" stackId="a" fill={ASSET_TONES[0]} radius={[3, 3, 3, 3]} />
									<Bar dataKey="investmentsNetWorth" name="Investments" stackId="a" fill={ASSET_TONES[1]} radius={[3, 3, 3, 3]} />
									<Bar dataKey="assetNetWorth" name="Real estate" stackId="a" fill={ASSET_TONES[2]} radius={[3, 3, 3, 3]} />
									<Line dataKey="netWorth" name="Net worth" stroke={T.ink} strokeDasharray="4 4" strokeWidth={2} dot={false} />
								</ComposedChart>
							</ResponsiveContainer>
						</Box>
					) : (
						<Box sx={{ padding: 4, textAlign: 'center' }}>
							<Typography sx={{ fontSize: 13, color: T.ink2 }}>Not enough data points yet</Typography>
						</Box>
					)}
				</Box>

				{/* Assets vs Liabilities + Composition (2-col) */}
				<Box sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
					gap: 2
				}}>
					{/* Assets vs Liabilities */}
					<Box sx={panelSx}>
						<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0, marginBottom: 1.5 }}>
							Assets vs liabilities
							<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 자산·부채</Box>
						</Typography>
						<Box sx={{ marginBottom: 1.25 }}>
							<Stack direction="row" justifyContent="space-between" sx={{ marginBottom: '6px' }}>
								<Typography sx={{ fontSize: 12, color: T.ink2 }}>Assets · 자산</Typography>
								<Typography sx={{ ...sMono, fontSize: 12, fontWeight: 600, color: T.pos }}>
									{fmtCurrency(breakdown.assets, displayCurrency)}
								</Typography>
							</Stack>
							<Box sx={{ height: 10, background: T.dark ? T.rule : T.surf2, borderRadius: '6px', overflow: 'hidden' }}>
								<Box sx={{ height: '100%', width: '100%', background: T.pos }} />
							</Box>
						</Box>
						<Box sx={{ marginBottom: 2 }}>
							<Stack direction="row" justifyContent="space-between" sx={{ marginBottom: '6px' }}>
								<Typography sx={{ fontSize: 12, color: T.ink2 }}>Liabilities · 부채</Typography>
								<Typography sx={{ ...sMono, fontSize: 12, fontWeight: 600, color: T.neg }}>
									{breakdown.liabilities > 0 ? '−' : ''}{fmtCurrency(breakdown.liabilities, displayCurrency)}
								</Typography>
							</Stack>
							<Box sx={{ height: 10, background: T.dark ? T.rule : T.surf2, borderRadius: '6px', overflow: 'hidden' }}>
								<Box sx={{
									height: '100%',
									width: breakdown.assets > 0 ? `${Math.min(100, breakdown.liabilities / breakdown.assets * 100)}%` : '0%',
									background: LIAB_TONE
								}} />
							</Box>
						</Box>
						<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ paddingTop: 1.25, borderTop: `1px solid ${T.rule}` }}>
							<Typography sx={lab}>Net</Typography>
							<Typography sx={{
								...sMono,
								fontSize: 16,
								fontWeight: 700,
								color: breakdown.netWorth < 0 ? T.neg : T.ink
							}}>
								{fmtCurrency(breakdown.netWorth, displayCurrency)}
							</Typography>
						</Stack>
					</Box>

					{/* Composition donut */}
					<Box sx={panelSx}>
						<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0, marginBottom: 1.5 }}>
							Composition
							<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 자산 구성</Box>
						</Typography>
						{compositionData.length === 0 ? (
							<Box sx={{ padding: 3, textAlign: 'center' }}>
								<Typography sx={{ fontSize: 13, color: T.ink2 }}>No assets to show</Typography>
							</Box>
						) : (
							<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
								<Box sx={{ width: 160, height: 160, position: 'relative', flexShrink: 0 }}>
									<ResponsiveContainer>
										<PieChart>
											<Pie
												data={compositionData}
												cx="50%"
												cy="50%"
												innerRadius={50}
												outerRadius={75}
												paddingAngle={3}
												dataKey="value"
												isAnimationActive={false}
											>
												{compositionData.map((d, i) => (
													<Cell key={i} fill={d.color} stroke="none" />
												))}
											</Pie>
											<Tooltip content={<ChartTooltip T={T} currency={displayCurrency} />} />
										</PieChart>
									</ResponsiveContainer>
									<Box sx={{
										position: 'absolute',
										inset: 0,
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										justifyContent: 'center',
										textAlign: 'center'
									}}>
										<Typography sx={{ fontSize: 10, color: T.ink2 }}>Total assets</Typography>
										<Typography sx={{ ...sDisplay, fontSize: 13, fontWeight: 700, color: T.ink }}>
											{fmtCurrency(totalAssetsValue, displayCurrency)}
										</Typography>
									</Box>
								</Box>
								<Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
									{compositionData.map(d => (
										<Stack key={d.name} direction="row" alignItems="center" spacing={1}>
											<Box sx={{ width: 10, height: 10, borderRadius: '3px', background: d.color, flexShrink: 0 }} />
											<Typography sx={{ fontSize: 12, fontWeight: 500, color: T.ink, flex: 1 }}>{d.name}</Typography>
											<Typography sx={{ ...sMono, fontSize: 11, color: T.ink2 }}>
												{totalAssetsValue > 0 ? `${Math.round(d.value / totalAssetsValue * 100)}%` : '—'}
											</Typography>
											<Typography sx={{ ...sMono, fontSize: 12, fontWeight: 600, color: T.ink }}>
												{fmtCurrency(d.value, displayCurrency)}
											</Typography>
										</Stack>
									))}
								</Stack>
							</Stack>
						)}
					</Box>
				</Box>

				{/* Financial Health */}
				{fhScore && fhDetails && (
					<Box sx={panelSx}>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
							<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 }}>
								Financial health
								<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 재무 건강도</Box>
							</Typography>
							<Stack direction="row" alignItems="center" spacing={1.25}>
								<Typography sx={{ ...sDisplay, fontSize: 28, fontWeight: 700, color: fhGrade.color, lineHeight: 1 }}>
									{fh}
								</Typography>
								<Box sx={{
									padding: '4px 10px',
									borderRadius: '999px',
									background: `${fhGrade.color}22`,
									color: fhGrade.color,
									fontSize: 11,
									fontWeight: 700,
									letterSpacing: '0.04em'
								}}>
									{fhGrade.label}
								</Box>
								<Typography sx={{ ...sMono, fontSize: 12, color: T.ink2 }}>/100</Typography>
							</Stack>
						</Stack>
						<LinearProgress
							variant="determinate"
							value={Math.min(100, Math.max(0, fh))}
							sx={{
								height: 8,
								borderRadius: '4px',
								background: T.dark ? T.rule : T.surf2,
								marginBottom: 2.5,
								'& .MuiLinearProgress-bar': { background: fhGrade.color, borderRadius: '4px' }
							}}
						/>
						<Box sx={{
							display: 'grid',
							gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
							gap: 2
						}}>
							<MetricBar label="💰 저축률 · Savings rate" score={fhScore.savings} max={25} detail={fhDetails.savings} T={T} />
							<MetricBar label="📈 투자 비중 · Investing" score={fhScore.investing} max={25} detail={fhDetails.investing} T={T} />
							<MetricBar label="🛡 비상금 · Emergency fund" score={fhScore.emergency} max={25} detail={fhDetails.emergency} T={T} />
							<MetricBar label="💳 부채 비율 · Debt ratio" score={fhScore.debt} max={25} detail={fhDetails.debt} T={T} />
						</Box>
					</Box>
				)}
			</Stack>
		</DesignPage>
	);
}

// Suppress unused-var warning for colorFor (kept for future use)
// eslint-disable-next-line no-unused-vars
const _kept = colorFor;

export default NetWorth;
