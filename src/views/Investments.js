import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import stringToColor from 'string-to-color';

import PropTypes from 'prop-types';
import { lighten, darken } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CategoryIcon from '@mui/icons-material/Category';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';

import DesignPage from '../components/DesignPage';
import SortMenuButton from '../components/SortMenuButton';
import { getNetWorthFlowAction, getNetWorthDailyAction } from '../actions/couchdbReportActions';
import { updateGeneralAction } from '../actions/couchdbSettingActions';
import { getInvestmentPerformance, computeChainLinkedTwr } from '../utils/performance';
import { toCurrencyFormatWithSymbol } from '../utils/formatting';
import useT from '../hooks/useT';
import { sDisplay, sMono, fmtCurrency, fmtQty, colorFor } from '../utils/designTokens';

const RANGES = ['1W', '2M', '3M', 'YTD', '1Y', 'All'];
const DAILY_RANGES = ['1W', '2M'];

const SVG_W = 1000;
const DEPTH_X = 22;
const DEPTH_Y = 20;
const FRONT_H = 52;
const SVG_H = DEPTH_Y + FRONT_H;
const BAR_W = SVG_W - DEPTH_X;

const linkStyle = { textDecoration: 'none', color: 'inherit' };

const getInvestmentsFromAccounts = (accounts) => {
	if (!accounts) return [];
	const accountInvestments = accounts.flatMap(account =>
		(account.investments || []).map(investment => ({
			name: investment.name,
			currency: account.currency,
			quantity: investment.quantity,
			purchasedValue: investment.purchasedValue,
			appraisedValue: investment.appraisedValue,
			profit: investment.appraisedValue - investment.purchasedValue
		}))
	);
	const aggregatedData = accountInvestments.reduce((acc, { name, currency, quantity, purchasedValue, appraisedValue, profit }) => {
		if (!acc[name]) {
			acc[name] = { name, currency, quantity: 0, purchasedValue: 0, appraisedValue: 0, profit: 0 };
		}
		acc[name].quantity += quantity;
		acc[name].purchasedValue += purchasedValue;
		acc[name].appraisedValue += appraisedValue;
		acc[name].profit += profit;
		return acc;
	}, {});
	return Object.values(aggregatedData).map(i => ({
		name: i.name,
		currency: i.currency,
		quantity: i.quantity,
		purchasedValue: i.purchasedValue,
		appraisedValue: i.appraisedValue,
		profit: i.profit,
		return: i.purchasedValue !== 0 ? i.profit / i.purchasedValue : 0
	})).filter(({ quantity }) => quantity > 0);
};

const makeFormatYAxis = (currency) => (value) => {
	if (currency === 'USD') {
		if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
		if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
		return `$${value.toLocaleString()}`;
	}
	if (value >= 100000000) return `${(value / 1000000000).toFixed(1)}B`;
	if (value >= 10000000) return `${(value / 1000000).toFixed(0)}M`;
	if (value >= 1000000) return `${(value / 1000).toFixed(0)}K`;
	return value.toLocaleString();
};

const toDateStr = (date) => date.toISOString().slice(0, 10);

const getStartDateStr = (range) => {
	const now = new Date();
	switch (range) {
	case '1W': { const d = new Date(now); d.setDate(d.getDate() - 7); return toDateStr(d); }
	case '2M': { const d = new Date(now); d.setMonth(d.getMonth() - 2); return toDateStr(d); }
	case '3M': { const d = new Date(now); d.setMonth(d.getMonth() - 3); return toDateStr(d); }
	case 'YTD': return `${now.getFullYear() - 1}-12-31`;
	case '1Y': { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return toDateStr(d); }
	default: return null;
	}
};

const ChartTooltip = ({ active, payload, label, currency }) => {
	if (active && payload && payload.length) {
		return (
			<Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, boxShadow: 3 }}>
				<Typography variant="caption" color="text.secondary">{label}</Typography>
				<Typography variant="body2" fontWeight="bold">{toCurrencyFormatWithSymbol(payload[0].value, currency)}</Typography>
			</Box>
		);
	}
	return null;
};

ChartTooltip.propTypes = {
	active: PropTypes.bool,
	currency: PropTypes.string,
	label: PropTypes.string,
	payload: PropTypes.array
};

const AllocationBar = ({ segments, currency = 'KRW' }) => {
	const total = segments.reduce((sum, s) => sum + s.value, 0);
	const [hovered, setHovered] = useState(null);

	let currentX = 0;
	const rects = segments.map(seg => {
		const w = (seg.value / total) * BAR_W;
		const x = currentX;
		currentX += w;
		const color = stringToColor(seg.name);
		const safeId = `grad-${seg.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
		return { ...seg, x, w, color, safeId };
	});

	const lastRect = rects[rects.length - 1];

	return (
		<Box>
			<Box sx={{ position: 'relative' }}>
				<svg
					viewBox={`0 0 ${SVG_W} ${SVG_H}`}
					width="100%"
					style={{ display: 'block', overflow: 'visible' }}
					onMouseLeave={() => setHovered(null)}
				>
					<defs>
						{rects.map(r => (
							<linearGradient key={r.safeId} id={r.safeId} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor={lighten(r.color, 0.18)} />
								<stop offset="100%" stopColor={darken(r.color, 0.12)} />
							</linearGradient>
						))}
					</defs>

					{/* top face */}
					{rects.map(r => (
						<polygon
							key={`top-${r.name}`}
							points={`${r.x},${DEPTH_Y} ${r.x + DEPTH_X},0 ${r.x + r.w + DEPTH_X},0 ${r.x + r.w},${DEPTH_Y}`}
							fill={lighten(r.color, 0.32)}
							stroke="rgba(0,0,0,0.12)"
							strokeWidth="1"
						/>
					))}

					{/* front face */}
					{rects.map(r => (
						<rect
							key={`front-${r.name}`}
							x={r.x}
							y={DEPTH_Y}
							width={r.w}
							height={FRONT_H}
							fill={`url(#${r.safeId})`}
							stroke="rgba(0,0,0,0.1)"
							strokeWidth="1"
							style={{ cursor: 'pointer' }}
							onMouseEnter={(e) => setHovered({ seg: r, clientX: e.clientX, clientY: e.clientY })}
							onMouseMove={(e) => setHovered(prev => prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null)}
						/>
					))}

					{/* right face (last segment) */}
					{lastRect && (
						<polygon
							points={`
								${lastRect.x + lastRect.w},${DEPTH_Y}
								${lastRect.x + lastRect.w + DEPTH_X},0
								${lastRect.x + lastRect.w + DEPTH_X},${FRONT_H}
								${lastRect.x + lastRect.w},${DEPTH_Y + FRONT_H}
							`}
							fill={darken(lastRect.color, 0.28)}
							stroke="rgba(0,0,0,0.1)"
							strokeWidth="1"
						/>
					)}

					{/* hover highlight */}
					{hovered && (
						<rect
							x={hovered.seg.x}
							y={DEPTH_Y}
							width={hovered.seg.w}
							height={FRONT_H}
							fill="rgba(255,255,255,0.18)"
							style={{ pointerEvents: 'none' }}
						/>
					)}
				</svg>

				{/* tooltip */}
				{hovered && (
					<Box sx={{
						position: 'fixed',
						left: hovered.clientX + 14,
						top: hovered.clientY - 70,
						bgcolor: 'background.paper',
						border: '1px solid',
						borderColor: 'divider',
						borderRadius: 1,
						p: 1,
						boxShadow: 4,
						pointerEvents: 'none',
						zIndex: 9999
					}}>
						<Stack spacing={0.3}>
							<Stack direction="row" spacing={0.5} alignItems="center">
								<Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: hovered.seg.color, flexShrink: 0 }} />
								<Typography variant="caption" fontWeight="bold">{hovered.seg.name}</Typography>
							</Stack>
							<Typography variant="body2">{toCurrencyFormatWithSymbol(hovered.seg.value, currency)}</Typography>
							<Typography variant="caption" color="text.secondary">
								{(hovered.seg.value / total * 100).toFixed(1)}%
							</Typography>
						</Stack>
					</Box>
				)}
			</Box>

			<Stack direction="row" flexWrap="wrap" spacing={1} sx={{ mt: 1.5 }}>
				{segments.map(seg => (
					<Stack key={seg.name} direction="row" spacing={0.5} alignItems="center">
						<Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: stringToColor(seg.name), flexShrink: 0 }} />
						<Typography variant="caption" color="text.secondary" noWrap>
							{seg.name} {(seg.value / total * 100).toFixed(1)}%
						</Typography>
					</Stack>
				))}
			</Stack>
		</Box>
	);
};

AllocationBar.propTypes = {
	currency: PropTypes.string,
	segments: PropTypes.arrayOf(PropTypes.shape({
		name: PropTypes.string,
		value: PropTypes.number
	}))
};

export function Investments () {
	const T = useT();
	const dispatch = useDispatch();
	const netWorthFlow = useSelector((state) => state.netWorthFlow);
	const netWorthDaily = useSelector((state) => state.netWorthDaily);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const allInvestmentsPrice = useSelector((state) => state.allInvestmentsPrice);
	const accountList = useSelector((state) => state.accountList);
	const allInvestments = useSelector((state) => state.allInvestments);
	const { exchangeRate, currency = 'KRW', stockListSortBy: sortBy = 'equity' } = useSelector((state) => state.settings);

	const [range, setRange] = useState('3M');
	const [view, setView] = useState('chart');
	const [aiComment, setAiComment] = useState(null);
	const [aiLoading, setAiLoading] = useState(false);
	const [cagrBase, setCagrBase] = useState(10);
	const [rhExpanded, setRhExpanded] = useState(false);
	const [rhData, setRhData] = useState(null);
	const [rhLoading, setRhLoading] = useState(false);
	const [rhError, setRhError] = useState(null);

	useEffect(() => {
		dispatch(getNetWorthFlowAction());
		dispatch(getNetWorthDailyAction());
	}, [dispatch]);

	const chartData = useMemo(() => {
		const startDateStr = getStartDateStr(range);
		const useDaily = DAILY_RANGES.includes(range);
		const source = useDaily ? netWorthDaily : netWorthFlow;
		return source
			.filter(item => !startDateStr || item.date >= startDateStr)
			.map(item => ({
				date: useDaily ? item.date : item.date.substring(0, 7),
				value: Math.round(currency === 'USD' ? item.investmentsNetWorth / exchangeRate : item.investmentsNetWorth)
			}));
	}, [netWorthFlow, netWorthDaily, range, currency, exchangeRate]);

	const allocationSegments = useMemo(() => {
		const allInvestmentsTransactions = allAccountsTransactions.filter(
			i => i.accountId && i.accountId.startsWith('account:Invst')
		);
		if (allInvestmentsTransactions.length === 0 || allInvestmentsPrice.length === 0) return [];

		return allInvestmentsPrice
			.filter(i => allInvestmentsTransactions.find(j => j.investment === i.name))
			.map(i => {
				const txns = allInvestmentsTransactions.filter(j => j.investment === i.name);
				const performance = getInvestmentPerformance(txns, i.price);
				const totalMarketValue = performance.reduce((sum, p) => sum + p.marketValue, 0);
				return {
					name: i.name,
					value: Math.round(currency === 'USD' ? (i.currency === 'USD' ? totalMarketValue : totalMarketValue / exchangeRate) : (i.currency === 'USD' ? totalMarketValue * exchangeRate : totalMarketValue))
				};
			})
			.filter(s => s.value > 0)
			.sort((a, b) => b.value - a.value);
	}, [allAccountsTransactions, allInvestmentsPrice, exchangeRate, currency]);

	const cashTxns = useMemo(() =>
		allAccountsTransactions.filter(t => t.accountId?.split(':')[2]?.match(/_Cash/)),
	[allAccountsTransactions]);

	const cagrData = useMemo(() => {
		if (netWorthFlow.length < 2) return null;
		const current = netWorthFlow[netWorthFlow.length - 1];
		const currentValue = current.investmentsNetWorth;
		if (!currentValue || currentValue <= 0) return null;

		const now = new Date();
		const targetDate = new Date(now);
		targetDate.setFullYear(targetDate.getFullYear() - cagrBase);
		const targetStr = targetDate.toISOString().slice(0, 7);
		const past = [...netWorthFlow].reverse().find(i => i.date.substring(0, 7) <= targetStr);
		if (!past || past.investmentsNetWorth <= 0) return null;

		// Use chain-linked TWR over the cagrBase period instead of simple V_end/V_start
		const filtered = netWorthFlow.filter(i => i.date >= past.date);
		const twr = computeChainLinkedTwr(filtered, cashTxns, accountList, exchangeRate);
		if (twr === null) return null;

		// Annualize using actual elapsed time
		const actualYears = (new Date(current.date) - new Date(past.date)) / (365.25 * 24 * 60 * 60 * 1000);
		if (actualYears <= 0) return null;
		const cagr = Math.pow(1 + twr, 1 / actualYears) - 1;

		const displayCurrent = currency === 'USD' ? currentValue / exchangeRate : currentValue;
		return {
			cagr,
			projections: [1, 3, 5, 10, 20].map(years => ({
				years,
				value: Math.round(displayCurrent * Math.pow(1 + cagr, years))
			}))
		};
	}, [netWorthFlow, cagrBase, currency, exchangeRate, cashTxns, accountList]);

	// Chain-linked TWR for the selected chart period
	const periodTwr = useMemo(() => {
		const startDateStr = getStartDateStr(range);
		const useDaily = DAILY_RANGES.includes(range);
		const source = useDaily ? netWorthDaily : netWorthFlow;
		const filtered = source.filter(item => !startDateStr || item.date >= startDateStr);
		return computeChainLinkedTwr(filtered, cashTxns, accountList, exchangeRate);
	}, [netWorthFlow, netWorthDaily, range, cashTxns, accountList, exchangeRate]);

	const rawStockList = useMemo(() => getInvestmentsFromAccounts(accountList), [accountList]);

	const stockList = useMemo(() => {
		const list = [...rawStockList];
		const convertToKRW = (item, key) => item.currency === 'USD' ? item[key] * exchangeRate : item[key];
		switch (sortBy) {
		case 'quantity':
			return list.sort((a, b) => b.quantity - a.quantity);
		case 'return':
			return list.sort((a, b) => b.return - a.return);
		default:
			return list.sort((a, b) => convertToKRW(b, 'appraisedValue') - convertToKRW(a, 'appraisedValue'));
		}
	}, [rawStockList, sortBy, exchangeRate]);

	const { totalProfit, totalPurchasedValue, totalAppraisedValue } = stockList.reduce((totals, inv) => {
		const toKRW = (v) => inv.currency === 'USD' ? v * exchangeRate : v;
		totals.totalProfit += toKRW(inv.profit);
		totals.totalPurchasedValue += toKRW(inv.purchasedValue);
		totals.totalAppraisedValue += toKRW(inv.appraisedValue);
		return totals;
	}, { totalProfit: 0, totalPurchasedValue: 0, totalAppraisedValue: 0 });

	const totalReturn = totalPurchasedValue !== 0 ? (totalProfit / totalPurchasedValue * 100) : 0;

	const handleSortChange = (newSortBy) => dispatch(updateGeneralAction('stockListSortBy', newSortBy));

	const fetchRhPositions = useCallback(async () => {
		setRhLoading(true);
		setRhError(null);
		try {
			const res = await fetch('/api/robinhoodAccounts');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			setRhData(data);
		} catch (err) {
			setRhError(err.message);
		} finally {
			setRhLoading(false);
		}
	}, []);

	const handleRhExpand = (_, expanded) => {
		setRhExpanded(expanded);
		if (expanded && !rhData && !rhLoading) {
			fetchRhPositions();
		}
	};

	const rhAccounts = rhData?.accounts ?? [];
	const rhAllPositions = rhAccounts.flatMap(a => a.positions ?? []);
	const rhTotalMv = rhAllPositions.reduce((sum, p) => sum + Number(p.units ?? 0) * Number(p.price ?? 0), 0);

	const fetchAiComment = async () => {
		if (stockList.length === 0) return;
		setAiLoading(true);
		setAiComment(null);
		try {
			const total = stockList.reduce((sum, i) => {
				const krw = i.currency === 'USD' ? i.appraisedValue * exchangeRate : i.appraisedValue;
				return sum + krw;
			}, 0);
			const holdings = stockList.map(i => {
				const krw = i.currency === 'USD' ? i.appraisedValue * exchangeRate : i.appraisedValue;
				return {
					name: i.name,
					displayValue: toCurrencyFormatWithSymbol(i.appraisedValue, i.currency),
					allocation: total > 0 ? (krw / total * 100).toFixed(1) : 0,
					returnRate: (i.return * 100).toFixed(2)
				};
			});
			const res = await fetch('/api/portfolioComment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					holdings,
					totalAppraisedValue: toCurrencyFormatWithSymbol(currency === 'USD' ? total / exchangeRate : total, currency),
					totalReturn: totalPurchasedValue !== 0 ? (totalProfit / totalPurchasedValue * 100).toFixed(2) : '0',
					currency,
					cagrBase: cagrData ? cagrBase : null,
					cagr: cagrData ? (cagrData.cagr * 100).toFixed(2) : null,
					projections: cagrData ? cagrData.projections.map(p => ({
						years: p.years,
						displayValue: toCurrencyFormatWithSymbol(p.value, currency)
					})) : null,
					periodTwr: periodTwr !== null ? (periodTwr * 100).toFixed(2) : null,
					periodRange: range
				})
			});
			const data = await res.json();
			setAiComment(data.comment || null);
		} catch (err) {
			console.error('fetchAiComment error:', err);
		} finally {
			setAiLoading(false);
		}
	};

	const latestValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
	const firstValue = chartData.length > 0 ? chartData[0].value : 0;
	const change = latestValue - firstValue;
	const changeRate = firstValue !== 0 ? (change / firstValue * 100) : 0;
	const isPositive = change >= 0;
	const formatYAxis = makeFormatYAxis(currency);
	const accentColor = isPositive ? T.pos : T.neg;
	const panelSx = {
		background: T.surf,
		border: `1px solid ${T.rule}`,
		borderRadius: '16px',
		padding: { xs: '16px', md: '20px' },
		color: T.ink
	};
	const sectionTitleSx = {
		...sDisplay,
		fontSize: 18,
		fontWeight: 700,
		color: T.ink,
		margin: 0
	};
	const chipSx = (active) => ({
		padding: '6px 12px',
		fontSize: 11,
		fontWeight: 600,
		borderRadius: '999px',
		background: active ? T.acc.bright : 'transparent',
		color: active ? T.acc.deep : T.ink,
		border: active ? 'none' : `1px solid ${T.rule}`,
		cursor: 'pointer',
		transition: 'all 0.15s',
		whiteSpace: 'nowrap'
	});

	if (netWorthFlow.length > 0 || netWorthDaily.length > 0) {
		return (
			<DesignPage title="Investments" titleKo="투자">
				<Stack spacing={2}>
					{/* Hero panel — portfolio total + chart/allocation */}
					<Box sx={panelSx}>
						<Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ marginBottom: 2 }}>
							<Box>
								<Typography sx={{ fontSize: 11, color: T.ink2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
									Portfolio · 포트폴리오
								</Typography>
								<Typography sx={{ ...sDisplay, fontSize: { xs: 28, md: 36 }, fontWeight: 700, marginTop: '6px', color: T.ink, lineHeight: 1 }}>
									{fmtCurrency(latestValue, currency)}
								</Typography>
								<Stack direction="row" spacing={1} alignItems="center" sx={{ marginTop: '8px', flexWrap: 'wrap', rowGap: 0.5 }}>
									<Box sx={{
										color: accentColor,
										background: isPositive ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)',
										padding: '4px 10px',
										borderRadius: '999px',
										fontWeight: 600,
										fontSize: 12,
										...sMono
									}}>
										{isPositive ? '+' : '−'}{fmtCurrency(Math.abs(change), currency)}{' '}
										({periodTwr !== null
											? `${periodTwr >= 0 ? '+' : ''}${(periodTwr * 100).toFixed(2)}%`
											: `${changeRate >= 0 ? '+' : ''}${changeRate.toFixed(2)}%`})
									</Box>
									{periodTwr !== null && (
										<Typography sx={{ fontSize: 11, color: T.ink3 }}>TWR</Typography>
									)}
								</Stack>
							</Box>
							<Stack direction="row" spacing={0.5}>
								<Box onClick={() => setView('chart')} sx={{ ...chipSx(view === 'chart'), display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
									<ShowChartIcon sx={{ fontSize: 14 }} /> Chart
								</Box>
								<Box onClick={() => setView('allocation')} sx={{ ...chipSx(view === 'allocation'), display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
									<CategoryIcon sx={{ fontSize: 14 }} /> Allocation
								</Box>
							</Stack>
						</Stack>

						{view === 'chart' ? (
							<>
								<Box sx={{ height: 300, width: '100%', minWidth: 0, overflow: 'hidden' }}>
									<ResponsiveContainer width="100%" height="100%">
										<AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
											<defs>
												<linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
													<stop offset="95%" stopColor={accentColor} stopOpacity={0} />
												</linearGradient>
											</defs>
											<CartesianGrid vertical={false} stroke={T.rule} />
											<XAxis dataKey="date" hide />
											<YAxis
												orientation="right"
												domain={['auto', 'auto']}
												tickFormatter={formatYAxis}
												tick={{ fontSize: 11, fill: T.ink2 }}
												tickLine={false}
												axisLine={false}
												width={50}
											/>
											<Tooltip content={(props) => <ChartTooltip {...props} currency={currency} />} />
											<Area
												type="monotone"
												dataKey="value"
												name="Portfolio"
												stroke={accentColor}
												strokeWidth={2}
												fill="url(#portfolioGradient)"
												dot={false}
												activeDot={{ r: 4, fill: accentColor }}
											/>
										</AreaChart>
									</ResponsiveContainer>
								</Box>
								<Stack direction="row" spacing={0.5} justifyContent="center" sx={{ marginTop: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
									{RANGES.map(r => (
										<Box key={r} onClick={() => setRange(r)} sx={chipSx(range === r)}>
											{r}
										</Box>
									))}
								</Stack>
							</>
						) : (
							allocationSegments.length > 0 && <AllocationBar segments={allocationSegments} currency={currency} />
						)}
					</Box>

					{/* AI Analysis panel */}
					<Box sx={panelSx}>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 1.5 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<AutoAwesomeIcon sx={{ fontSize: 18, color: T.acc.hero }} />
								<Typography sx={sectionTitleSx}>
									AI Portfolio Analysis
									<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 13 }}> · 포트폴리오 분석</Box>
								</Typography>
							</Stack>
							<IconButton
								size="small"
								onClick={fetchAiComment}
								disabled={aiLoading}
								sx={{ color: T.ink2, '&:hover': { color: T.acc.hero } }}
							>
								{aiLoading ? <CircularProgress size={16} sx={{ color: T.acc.hero }} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
							</IconButton>
						</Stack>

						{cagrData && (
							<>
								<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 1, flexWrap: 'wrap', rowGap: 1 }}>
									<Stack direction="row" spacing={0.75} alignItems="baseline">
										<Typography sx={{ fontSize: 11, color: T.ink2, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
											Projection · 미래가치 추정
										</Typography>
										<Typography sx={{ fontSize: 12, color: colorFor(T, cagrData.cagr), fontWeight: 700 }}>
											CAGR {cagrData.cagr >= 0 ? '+' : ''}{(cagrData.cagr * 100).toFixed(1)}%
										</Typography>
									</Stack>
									<Stack direction="row" spacing={0.5}>
										{[1, 3, 5, 10].map(y => (
											<Box key={y} onClick={() => setCagrBase(y)} sx={chipSx(cagrBase === y)}>
												{y}Y
											</Box>
										))}
									</Stack>
								</Stack>
								<Box sx={{
									display: 'grid',
									gridTemplateColumns: 'repeat(5, 1fr)',
									gap: 1,
									marginBottom: 1.5
								}}>
									{cagrData.projections.map(p => (
										<Box key={p.years} sx={{
											padding: 1,
											borderRadius: '8px',
											background: T.dark ? 'rgba(255,255,255,0.02)' : T.surf2,
											border: `1px solid ${T.rule}`,
											textAlign: 'center'
										}}>
											<Typography sx={{ fontSize: 10, color: T.ink3, fontWeight: 600, textTransform: 'uppercase' }}>
												{p.years} yr
											</Typography>
											<Typography sx={{ ...sMono, fontSize: 12, fontWeight: 700, color: T.ink, marginTop: '2px' }}>
												{fmtCurrency(p.value, currency)}
											</Typography>
										</Box>
									))}
								</Box>
							</>
						)}

						{aiComment && (
							<Box sx={{ padding: 1.5, background: T.acc.tint, color: T.ink, borderRadius: '8px', fontSize: 13, lineHeight: 1.6 }}>
								{aiComment}
							</Box>
						)}
						{!aiComment && !aiLoading && (
							<Typography sx={{ fontSize: 12, color: T.ink3 }}>
								Click the refresh icon to get AI analysis.
							</Typography>
						)}
						<Typography sx={{ fontSize: 11, color: T.ink3, display: 'block', marginTop: 1 }}>
							* Past performance does not guarantee future results.
						</Typography>
					</Box>

					{/* Accounts panel */}
					<Box sx={panelSx}>
						<Typography sx={{ ...sectionTitleSx, marginBottom: 1.5 }}>
							Accounts
							<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 13 }}> · 계좌</Box>
						</Typography>
						{accountList
							.filter(a => a.type === 'Invst' && !a.closed && !a.name.match(/_Cash/i))
							.map((a, idx) => (
								<Link key={a.name} to={`/Invst/${a.name}`} style={linkStyle}>
									<Box sx={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										padding: '12px 4px',
										borderTop: idx === 0 ? 'none' : `1px solid ${T.rule}`,
										cursor: 'pointer',
										'&:hover': { background: T.surf2 }
									}}>
										<Typography sx={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{a.name}</Typography>
										<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: a.balance < 0 ? T.neg : T.ink }}>
											{fmtCurrency(Number(a.balance) || 0, a.currency || 'KRW')}
										</Typography>
									</Box>
								</Link>
							))}
					</Box>

					{/* Holdings panel — table-style */}
					<Box sx={panelSx}>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 1.5 }}>
							<Typography sx={sectionTitleSx}>
								Holdings
								<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 13 }}> · 보유 종목</Box>
							</Typography>
							<SortMenuButton
								value={sortBy}
								onChange={handleSortChange}
								options={[
									{ value: 'equity', label: 'Equity' },
									{ value: 'quantity', label: 'Quantity' },
									{ value: 'return', label: 'Return' }
								]}
							/>
						</Stack>
						<Box sx={{ border: `1px solid ${T.rule}`, borderRadius: '12px', overflow: 'hidden' }}>
							<Box sx={{
								display: 'grid',
								gridTemplateColumns: { xs: '1fr 90px 110px', md: '1fr 90px 130px 150px' },
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
								<Box>Name</Box>
								<Box sx={{ textAlign: 'right' }}>Qty</Box>
								<Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>Market value</Box>
								<Box sx={{ textAlign: 'right' }}>Profit · Return</Box>
							</Box>
							{stockList.map(i => {
								const investment = allInvestments.find(j => j.name === i.name);
								const rate = investment?.rate;
								const profitColor = i.profit >= 0 ? T.pos : T.neg;
								return (
									<Link key={i.name} to={`/performance/${i.name}`} style={linkStyle}>
										<Box sx={{
											display: 'grid',
											gridTemplateColumns: { xs: '1fr 90px 110px', md: '1fr 90px 130px 150px' },
											gap: 1.25,
											padding: '12px 14px',
											alignItems: 'center',
											background: T.surf,
											borderTop: `1px solid ${T.rule}`,
											cursor: 'pointer',
											'&:hover': { background: T.surf2 }
										}}>
											<Box sx={{ minWidth: 0 }}>
												<Typography sx={{ fontSize: 13, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
													{i.name}
												</Typography>
												{typeof rate === 'number' && (
													<Typography sx={{ ...sMono, fontSize: 11, color: rate > 0 ? T.pos : rate < 0 ? T.neg : T.ink2 }}>
														{rate > 0 ? '+' : ''}{rate}%
													</Typography>
												)}
											</Box>
											<Typography sx={{ ...sMono, fontSize: 13, color: T.ink, textAlign: 'right' }}>
												{fmtQty(i.quantity)}
											</Typography>
											<Typography sx={{
												...sMono,
												fontSize: 13,
												color: T.ink,
												textAlign: 'right',
												display: { xs: 'none', md: 'block' }
											}}>
												{fmtCurrency(i.appraisedValue, i.currency)}
											</Typography>
											<Stack alignItems="flex-end" sx={{ minWidth: 0 }}>
												<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: profitColor, whiteSpace: 'nowrap' }}>
													{i.profit >= 0 ? '+' : '−'}{fmtCurrency(Math.abs(i.profit), i.currency)}
												</Typography>
												<Typography sx={{ ...sMono, fontSize: 11, color: profitColor }}>
													{i.return > 0 ? '+' : ''}{(i.return * 100).toFixed(2)}%
												</Typography>
											</Stack>
										</Box>
									</Link>
								);
							})}
							{/* Subtotal row */}
							<Box sx={{
								display: 'grid',
								gridTemplateColumns: { xs: '1fr 90px 110px', md: '1fr 90px 130px 150px' },
								gap: 1.25,
								padding: '12px 14px',
								alignItems: 'center',
								background: T.dark ? '#15151c' : '#f5f5fa',
								borderTop: `1px solid ${T.rule}`
							}}>
								<Typography sx={{ fontSize: 12, fontWeight: 700, color: T.ink, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
									Subtotal
								</Typography>
								<Box />
								<Typography sx={{
									...sMono,
									fontSize: 13,
									fontWeight: 700,
									color: T.ink,
									textAlign: 'right',
									display: { xs: 'none', md: 'block' }
								}}>
									{fmtCurrency(totalAppraisedValue, currency)}
								</Typography>
								<Stack alignItems="flex-end">
									<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 700, color: totalProfit >= 0 ? T.pos : T.neg, whiteSpace: 'nowrap' }}>
										{totalProfit >= 0 ? '+' : '−'}{fmtCurrency(Math.abs(totalProfit), currency)}
									</Typography>
									<Typography sx={{ ...sMono, fontSize: 11, color: totalProfit >= 0 ? T.pos : T.neg }}>
										{totalReturn > 0 ? '+' : ''}{totalReturn.toFixed(2)}%
									</Typography>
								</Stack>
							</Box>
						</Box>
					</Box>

					{/* Managed Accounts (Robinhood/SnapTrade) */}
					<Box sx={panelSx}>
						<Stack
							direction="row"
							justifyContent="space-between"
							alignItems="center"
							sx={{ cursor: 'pointer', userSelect: 'none' }}
							onClick={() => handleRhExpand(null, !rhExpanded)}
						>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
								<Typography sx={sectionTitleSx}>
									Managed Accounts
									<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 13 }}> · 위탁계좌</Box>
								</Typography>
								{rhData && (
									<Box sx={{
										padding: '2px 8px',
										fontSize: 11,
										fontWeight: 600,
										borderRadius: '999px',
										background: T.acc.bg,
										color: T.acc.deep
									}}>
										{rhAllPositions.length}
									</Box>
								)}
								{rhData && rhTotalMv > 0 && (
									<Typography sx={{ ...sMono, fontSize: 12, color: T.ink2 }}>
										${rhTotalMv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
									</Typography>
								)}
							</Stack>
							<ExpandMoreIcon sx={{
								color: T.ink2,
								transform: rhExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
								transition: 'transform 0.15s'
							}} />
						</Stack>

						{rhExpanded && (
							<Box sx={{ marginTop: 2 }}>
								{rhLoading && (
									<Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
										<CircularProgress size={24} sx={{ color: T.acc.hero }} />
									</Box>
								)}
								{rhError && (
									<Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
										<Typography sx={{ fontSize: 12, color: T.neg }}>{rhError}</Typography>
										<IconButton size="small" onClick={fetchRhPositions} sx={{ color: T.ink2 }}>
											<RefreshIcon sx={{ fontSize: 16 }} />
										</IconButton>
									</Stack>
								)}
								{rhData && !rhLoading && (
									rhAccounts.length > 0 ? (
										[...rhAccounts].sort((a, b) => String(a.number ?? '').localeCompare(String(b.number ?? ''))).map((account, ai) => {
											const positions = account.positions ?? [];
											const balances = account.balances ?? [];
											const accountMv = positions.reduce((sum, p) => sum + Number(p.units ?? 0) * Number(p.price ?? 0), 0);
											const accountPnl = positions.reduce((sum, p) => sum + Number(p.open_pnl ?? 0), 0);
											const acPnlColor = accountPnl >= 0 ? T.pos : T.neg;
											const fmt = (v) => `$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
											return (
												<Box key={account.id} sx={{ marginBottom: ai < rhAccounts.length - 1 ? 2 : 0 }}>
													<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 1 }}>
														<Box>
															<Typography sx={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
																{account.institution_name ?? account.name}
															</Typography>
															{account.number && (
																<Typography sx={{ fontSize: 11, color: T.ink3 }}>{account.number}</Typography>
															)}
														</Box>
														<Stack alignItems="flex-end">
															<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: T.ink }}>{fmt(accountMv)}</Typography>
															<Typography sx={{ ...sMono, fontSize: 11, fontWeight: 600, color: acPnlColor }}>
																{accountPnl >= 0 ? '+' : '−'}{fmt(accountPnl)}
															</Typography>
														</Stack>
													</Stack>
													{positions.length > 0 && (
														<Box sx={{ border: `1px solid ${T.rule}`, borderRadius: '10px', overflow: 'hidden' }}>
															<Box sx={{
																display: 'grid',
																gridTemplateColumns: '1fr 70px 130px 110px',
																gap: 1,
																padding: '8px 12px',
																background: T.dark ? '#15151c' : '#f5f5fa',
																fontSize: 11,
																color: T.ink2,
																fontWeight: 600,
																textTransform: 'uppercase',
																letterSpacing: '0.06em'
															}}>
																<Box>Symbol</Box>
																<Box sx={{ textAlign: 'right' }}>Qty</Box>
																<Box sx={{ textAlign: 'right' }}>Market value</Box>
																<Box sx={{ textAlign: 'right' }}>P&L</Box>
															</Box>
															{[...positions]
																.sort((a, b) => (b.units * b.price) - (a.units * a.price))
																.map((p, i) => {
																	const ticker = p.symbol?.symbol?.symbol ?? '-';
																	const description = p.symbol?.symbol?.description ?? '';
																	const units = Number(p.units ?? 0);
																	const price = Number(p.price ?? 0);
																	const marketValue = units * price;
																	const allocation = accountMv > 0 ? (marketValue / accountMv * 100) : 0;
																	const pnl = Number(p.open_pnl ?? 0);
																	const rowPnlColor = pnl >= 0 ? T.pos : T.neg;
																	return (
																		<Box key={i} sx={{
																			display: 'grid',
																			gridTemplateColumns: '1fr 70px 130px 110px',
																			gap: 1,
																			padding: '10px 12px',
																			alignItems: 'center',
																			borderTop: `1px solid ${T.rule}`,
																			'&:hover': { background: T.surf2 }
																		}}>
																			<Box sx={{ minWidth: 0 }}>
																				<Typography sx={{ fontSize: 12, fontWeight: 700, color: T.ink }}>{ticker}</Typography>
																				{description && (
																					<Typography sx={{ fontSize: 10, color: T.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</Typography>
																				)}
																			</Box>
																			<Typography sx={{ ...sMono, fontSize: 12, color: T.ink, textAlign: 'right' }}>
																				{units % 1 === 0 ? units.toLocaleString() : units.toFixed(4)}
																			</Typography>
																			<Stack alignItems="flex-end">
																				<Typography sx={{ ...sMono, fontSize: 12, color: T.ink }}>{fmt(marketValue)}</Typography>
																				<Typography sx={{ ...sMono, fontSize: 10, color: T.ink2 }}>{allocation.toFixed(1)}%</Typography>
																			</Stack>
																			<Typography sx={{ ...sMono, fontSize: 12, fontWeight: 600, color: rowPnlColor, textAlign: 'right' }}>
																				{pnl >= 0 ? '+' : '−'}{fmt(pnl)}
																			</Typography>
																		</Box>
																	);
																})}
															<Box sx={{
																display: 'grid',
																gridTemplateColumns: '1fr 70px 130px 110px',
																gap: 1,
																padding: '10px 12px',
																alignItems: 'center',
																background: T.dark ? '#15151c' : '#f5f5fa',
																borderTop: `1px solid ${T.rule}`
															}}>
																<Typography sx={{ fontSize: 11, fontWeight: 700, color: T.ink, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
																	Total
																</Typography>
																<Box />
																<Typography sx={{ ...sMono, fontSize: 12, fontWeight: 700, color: T.ink, textAlign: 'right' }}>{fmt(accountMv)}</Typography>
																<Typography sx={{ ...sMono, fontSize: 12, fontWeight: 700, color: acPnlColor, textAlign: 'right' }}>
																	{accountPnl >= 0 ? '+' : '−'}{fmt(accountPnl)}
																</Typography>
															</Box>
														</Box>
													)}
													{balances.length > 0 && (
														<Stack spacing={0.25} sx={{ marginTop: 1, paddingTop: 1, borderTop: `1px solid ${T.rule}` }}>
															{balances.map((b, i) => (
																<Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
																	<Typography sx={{ fontSize: 11, color: T.ink2 }}>{b.currency?.code ?? b.currency ?? '-'} Cash</Typography>
																	<Typography sx={{ ...sMono, fontSize: 11, color: T.ink }}>
																		${Number(b.cash ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
																	</Typography>
																</Stack>
															))}
														</Stack>
													)}
												</Box>
											);
										})
									) : (
										<Typography sx={{ fontSize: 12, color: T.ink3 }}>No accounts found.</Typography>
									)
								)}
							</Box>
						)}
					</Box>
				</Stack>
			</DesignPage>
		);
	} else {
		return (
			<DesignPage title="Investments" titleKo="투자" loading>
				<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
					<CircularProgress />
				</Box>
			</DesignPage>
		);
	}
}

export default Investments;
