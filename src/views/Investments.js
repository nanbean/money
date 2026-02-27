import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import stringToColor from 'string-to-color';

import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { lighten, darken } from '@mui/material/styles';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CategoryIcon from '@mui/icons-material/Category';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';

import Layout from '../components/Layout';
import Amount from '../components/Amount';
import SortMenuButton from '../components/SortMenuButton';
import { getNetWorthFlowAction, getNetWorthDailyAction } from '../actions/couchdbReportActions';
import { updateGeneralAction } from '../actions/couchdbSettingActions';
import { getInvestmentPerformance, computeChainLinkedTwr } from '../utils/performance';
import { toCurrencyFormatWithSymbol } from '../utils/formatting';
import {
	POSITIVE_AMOUNT_DARK_COLOR,
	POSITIVE_AMOUNT_LIGHT_COLOR,
	NEGATIVE_AMOUNT_COLOR
} from '../constants';

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
	const theme = useTheme();
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
	const [cagrBase, setCagrBase] = useState(3);
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
	const isDarkMode = theme.palette.mode === 'dark';
	const positiveColor = isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR;
	const negativeColor = NEGATIVE_AMOUNT_COLOR;
	const accentColor = isPositive ? positiveColor : negativeColor;

	if (netWorthFlow.length > 0 || netWorthDaily.length > 0) {
		return (
			<Layout showPaper={false} title="Investments">
				<Stack spacing={2}>
					<Stack direction="row" alignItems="flex-start" justifyContent="space-between">
						<Stack spacing={0.5}>
							<Typography variant="caption" color="text.secondary">Portfolio</Typography>
							<Typography variant="h5" fontWeight="bold">{toCurrencyFormatWithSymbol(latestValue, currency)}</Typography>
							<Stack direction="row" spacing={0.5} alignItems="center">
								<Typography variant="body2" sx={{ color: accentColor }}>
									{isPositive ? '+' : ''}{toCurrencyFormatWithSymbol(change, currency)} ({isPositive ? '+' : ''}{periodTwr !== null ? (periodTwr * 100).toFixed(2) : changeRate.toFixed(2)}%)
								</Typography>
								{periodTwr !== null && (
									<Typography variant="caption" color="text.disabled">TWR</Typography>
								)}
							</Stack>
						</Stack>
						<ToggleButtonGroup
							value={view}
							exclusive
							onChange={(_, val) => val && setView(val)}
							size="small"
						>
							<ToggleButton value="chart">
								<ShowChartIcon fontSize="small" />
							</ToggleButton>
							<ToggleButton value="allocation">
								<CategoryIcon fontSize="small" />
							</ToggleButton>
						</ToggleButtonGroup>
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
										<CartesianGrid vertical={false} stroke={theme.palette.divider} />
										<XAxis dataKey="date" hide />
										<YAxis
											orientation="right"
											domain={['auto', 'auto']}
											tickFormatter={formatYAxis}
											tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
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
							<Stack direction="row" justifyContent="center">
								<ToggleButtonGroup
									value={range}
									exclusive
									onChange={(_, val) => val && setRange(val)}
									size="small"
								>
									{RANGES.map(r => (
										<ToggleButton key={r} value={r} sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
											{r}
										</ToggleButton>
									))}
								</ToggleButtonGroup>
							</Stack>
						</>
					) : (
						allocationSegments.length > 0 && <AllocationBar segments={allocationSegments} currency={currency} />
					)}

					<Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5 }}>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
							<Stack direction="row" spacing={0.5} alignItems="center">
								<AutoAwesomeIcon fontSize="small" sx={{ color: 'text.secondary' }} />
								<Typography variant="caption" color="text.secondary">AI Portfolio Analysis</Typography>
							</Stack>
							<IconButton size="small" onClick={fetchAiComment} disabled={aiLoading}>
								{aiLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
							</IconButton>
						</Stack>

						{cagrData && (
							<>
								<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
									<Stack direction="row" spacing={0.5} alignItems="baseline">
										<Typography variant="caption" color="text.secondary">Projection Based on Historical Returns</Typography>
										<Typography variant="caption" sx={{ color: cagrData.cagr >= 0 ? (isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR) : NEGATIVE_AMOUNT_COLOR, fontWeight: 'bold' }}>
											CAGR {cagrData.cagr >= 0 ? '+' : ''}{(cagrData.cagr * 100).toFixed(1)}%
										</Typography>
									</Stack>
									<ToggleButtonGroup value={cagrBase} exclusive onChange={(_, v) => v && setCagrBase(v)} size="small">
										{[1, 3, 5, 10].map(y => (
											<ToggleButton key={y} value={y} sx={{ px: 1, py: 0.25, fontSize: '0.7rem' }}>{y}Y</ToggleButton>
										))}
									</ToggleButtonGroup>
								</Stack>
								<Table size="small" sx={{ mb: 1 }}>
									<TableBody>
										{cagrData.projections.map(p => (
											<TableRow key={p.years}>
												<TableCell sx={{ py: 0.5, color: 'text.secondary', fontSize: '0.75rem', border: 'none' }}>{p.years} yr</TableCell>
												<TableCell align="right" sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.85rem', border: 'none' }}>
													{toCurrencyFormatWithSymbol(p.value, currency)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								<Divider sx={{ mb: 1 }} />
							</>
						)}

						{aiComment && (
							<Typography variant="body2" sx={{ lineHeight: 1.6 }}>{aiComment}</Typography>
						)}
						{!aiComment && !aiLoading && (
							<Typography variant="caption" color="text.disabled">Click refresh to get AI analysis.</Typography>
						)}
						<Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
							* Past performance does not guarantee future results.
						</Typography>
					</Box>

					<Divider />

					<Box>
						<Typography variant="caption" color="text.secondary">Accounts</Typography>
						{accountList
							.filter(a => a.type === 'Invst' && !a.closed && !a.name.match(/_Cash/i))
							.map(a => (
								<Link key={a.name} to={`/Invst/${a.name}`} style={linkStyle}>
									<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, borderRadius: 1, '&:hover': { backgroundColor: 'action.hover' } }}>
										<Typography variant="body2">{a.name}</Typography>
										<Amount value={a.balance} currency={a.currency} showSymbol showOriginal />
									</Stack>
								</Link>
							))}
					</Box>

					<Divider />

					<Box>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
							<Typography variant="caption" color="text.secondary">Investments</Typography>
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
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Name</TableCell>
									<TableCell align="right">Qty</TableCell>
									<TableCell align="right">Market Value</TableCell>
									<TableCell align="right">Retrun (%)</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{stockList.map(i => {
									const investment = allInvestments.find(j => j.name === i.name);
									const rate = investment?.rate;
									const returnColor = i.return > 0 ? (isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR) : NEGATIVE_AMOUNT_COLOR;
									return (
										<TableRow key={i.name} hover sx={{ cursor: 'pointer' }}>
											<TableCell>
												<Link to={`/performance/${i.name}`} style={linkStyle}>
													<Typography variant="body2">{i.name}</Typography>
													{rate && (
														<Typography variant="caption" sx={{ color: rate > 0 ? (isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR) : NEGATIVE_AMOUNT_COLOR }}>
															{rate > 0 ? '+' : ''}{rate}%
														</Typography>
													)}
												</Link>
											</TableCell>
											<TableCell align="right">
												<Typography variant="body2">{i.quantity.toLocaleString()}</Typography>
											</TableCell>
											<TableCell align="right">
												<Amount value={i.appraisedValue} showSymbol showOriginal currency={i.currency} />
											</TableCell>
											<TableCell align="right">
												<Amount value={Math.round(i.profit)} negativeColor showSymbol currency={i.currency} />
												<Typography variant="caption" sx={{ color: returnColor }}>
													({i.return > 0 ? '+' : ''}{(i.return * 100).toFixed(2)}%)
												</Typography>
											</TableCell>
										</TableRow>
									);
								})}
								<TableRow>
									<TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
									<TableCell align="right">
										<Amount value={totalAppraisedValue} showSymbol currency="KRW" />
									</TableCell>
									<TableCell align="right">
										<Amount value={Math.round(totalProfit)} negativeColor showSymbol currency="KRW" />
										<Typography variant="caption" sx={{ color: totalProfit > 0 ? (theme.palette.mode === 'dark' ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR) : NEGATIVE_AMOUNT_COLOR }}>
											({totalReturn > 0 ? '+' : ''}{totalReturn.toFixed(2)}%)
										</Typography>
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</Box>
					<Divider />

					<Accordion
						expanded={rhExpanded}
						onChange={handleRhExpand}
						disableGutters
						elevation={0}
						sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}
					>
						<AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">Managed Accounts</Typography>
								{rhData && (
									<Chip label={rhAllPositions.length} size="small" sx={{ height: 16, fontSize: '0.65rem' }} />
								)}
								{rhData && rhTotalMv > 0 && (
									<Typography variant="caption" color="text.secondary">
										${rhTotalMv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
									</Typography>
								)}
							</Stack>
						</AccordionSummary>
						<AccordionDetails sx={{ px: 0 }}>
							{rhLoading && (
								<Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
									<CircularProgress size={24} />
								</Box>
							)}
							{rhError && (
								<Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
									<Typography variant="caption" color="error">{rhError}</Typography>
									<IconButton size="small" onClick={fetchRhPositions}>
										<RefreshIcon fontSize="small" />
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
										const acPnlColor = accountPnl >= 0 ? (isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR) : NEGATIVE_AMOUNT_COLOR;
										const fmt = (v) => `$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
										return (
											<Box key={account.id}>
												<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
													<Stack spacing={0}>
														<Typography variant="caption" fontWeight="bold" color="text.primary">
															{account.institution_name ?? account.name}
														</Typography>
														{account.number && (
															<Typography variant="caption" color="text.disabled">{account.number}</Typography>
														)}
													</Stack>
													<Stack alignItems="flex-end" spacing={0}>
														<Typography variant="caption">{fmt(accountMv)}</Typography>
														<Typography variant="caption" sx={{ color: acPnlColor }}>
															{accountPnl >= 0 ? '+' : '-'}{fmt(accountPnl)}
														</Typography>
													</Stack>
												</Stack>
												{positions.length > 0 && (
													<Table size="small">
														<TableHead>
															<TableRow>
																<TableCell>Symbol</TableCell>
																<TableCell align="right">Qty</TableCell>
																<TableCell align="right">Market Value</TableCell>
																<TableCell align="right">P&L</TableCell>
															</TableRow>
														</TableHead>
														<TableBody>
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
																	const rowPnlColor = pnl >= 0 ? (isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR) : NEGATIVE_AMOUNT_COLOR;
																	return (
																		<TableRow key={i} hover>
																			<TableCell>
																				<Typography variant="body2" fontWeight="bold">{ticker}</Typography>
																				{description && (
																					<Typography variant="caption" color="text.secondary" display="block">{description}</Typography>
																				)}
																			</TableCell>
																			<TableCell align="right">
																				<Typography variant="body2">{units % 1 === 0 ? units.toLocaleString() : units.toFixed(4)}</Typography>
																			</TableCell>
																			<TableCell align="right">
																				<Typography variant="body2">{fmt(marketValue)}</Typography>
																				<Typography variant="caption" color="text.secondary">{allocation.toFixed(1)}%</Typography>
																			</TableCell>
																			<TableCell align="right">
																				<Typography variant="body2" sx={{ color: rowPnlColor }}>
																					{pnl >= 0 ? '+' : '-'}{fmt(pnl)}
																				</Typography>
																			</TableCell>
																		</TableRow>
																	);
																})}
															<TableRow>
																<TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total</TableCell>
																<TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(accountMv)}</TableCell>
																<TableCell align="right">
																	<Typography variant="body2" sx={{ color: acPnlColor, fontWeight: 'bold' }}>
																		{accountPnl >= 0 ? '+' : '-'}{fmt(accountPnl)}
																	</Typography>
																</TableCell>
															</TableRow>
														</TableBody>
													</Table>
												)}
												{balances.length > 0 && (
													<Box sx={{ mt: 1 }}>
														<Divider sx={{ mb: 0.5 }} />
														{balances.map((b, i) => (
															<Stack key={i} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.25 }}>
																<Typography variant="caption" color="text.secondary">{b.currency?.code ?? b.currency ?? '-'} Cash</Typography>
																<Typography variant="caption">${Number(b.cash ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
															</Stack>
														))}
													</Box>
												)}
												{ai < rhAccounts.length - 1 && <Divider sx={{ mt: 2, mb: 2 }} />}
											</Box>
										);
									})
								) : (
									<Typography variant="caption" color="text.disabled">No accounts found.</Typography>
								)
							)}
						</AccordionDetails>
					</Accordion>

				</Stack>
			</Layout>
		);
	} else {
		return (
			<Layout title="Investments">
				<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
					<CircularProgress />
				</Box>
			</Layout>
		);
	}
}

export default Investments;
