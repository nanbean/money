import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
	BarChart,
	Bar,
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
	Cell
} from 'recharts';

import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';

import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';

import DesignPage from '../components/DesignPage';
import SpendingHeatmap from '../components/SpendingHeatmap';
import BankTransactionModal from '../components/BankTransactionModal';
import { openTransactionInModal } from '../actions/ui/form/bankTransaction';
import { getCategoryColor } from '../utils/categoryColor';
import { getCategoryIcon } from '../utils/categoryIcon';
import useT from '../hooks/useT';
import { sDisplay, sMono, fmtCurrency, fmtCurrencyFull } from '../utils/designTokens';
import { NON_EXPENSE_CATEGORY, TYPE_ICON_MAP } from '../constants';

const RANGES = ['1M', '3M', '6M', 'YTD', '1Y'];
const EXPENSE_TYPES = ['Bank', 'CCard', 'Cash'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const INFLATION_RATE = 1.025;

const getStartMonthStr = (range) => {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();
	switch (range) {
	case '1M': return new Date(year, month, 1).toISOString().slice(0, 7);
	case '3M': return new Date(year, month - 2, 1).toISOString().slice(0, 7);
	case '6M': return new Date(year, month - 5, 1).toISOString().slice(0, 7);
	case 'YTD': return `${year}-01`;
	case '1Y': return new Date(year, month - 12, 1).toISOString().slice(0, 7);
	default: return null;
	}
};

const makeFormatYAxis = (currency) => (value) => {
	if (currency === 'USD') {
		if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
		if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
		return `$${value}`;
	}
	if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
	if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
	if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
	return value.toLocaleString();
};

const ChartTooltip = ({ active, payload, label, T, currency }) => {
	if (active && payload && payload.length) {
		const actual = payload.find(p => p.dataKey === 'actual')?.value ?? payload[0].value;
		const projected = payload.find(p => p.dataKey === 'projected')?.value ?? 0;
		return (
			<Box sx={{
				background: T.surf,
				padding: 1,
				border: `1px solid ${T.rule}`,
				borderRadius: '8px',
				boxShadow: T.dark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(15,23,42,0.08)',
				minWidth: 140
			}}>
				<Typography sx={{ fontSize: 11, color: T.ink2, marginBottom: 0.25 }}>{label}</Typography>
				{projected > 0 ? (
					<>
						<Typography sx={{ ...sMono, fontSize: 12, fontWeight: 600, color: T.ink }}>
							{`Actual ${fmtCurrency(actual, currency)}`}
						</Typography>
						<Typography sx={{ ...sMono, fontSize: 11, color: T.ink2 }}>
							{`Projected ${fmtCurrency(actual + projected, currency)}`}
						</Typography>
					</>
				) : (
					<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 700, color: T.ink }}>
						{fmtCurrency(actual, currency)}
					</Typography>
				)}
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

const AnnualTooltip = ({ active, payload, label, T, currency, currentYear }) => {
	if (active && payload && payload.length) {
		const lastYear = payload.find(p => p.dataKey === 'lastYear')?.value ?? 0;
		const actual = payload.find(p => p.dataKey === 'actual')?.value;
		const projected = payload.find(p => p.dataKey === 'projected')?.value;
		const thisYear = actual ?? projected ?? 0;
		return (
			<Box sx={{
				background: T.surf,
				padding: 1,
				border: `1px solid ${T.rule}`,
				borderRadius: '8px',
				boxShadow: T.dark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(15,23,42,0.08)',
				minWidth: 160
			}}>
				<Typography sx={{ fontSize: 11, color: T.ink2, marginBottom: 0.25 }}>{label} (Cumulative)</Typography>
				<Typography sx={{ ...sMono, fontSize: 11, color: T.ink3 }}>
					{`${currentYear - 1} ${fmtCurrency(lastYear, currency)}`}
				</Typography>
				<Typography sx={{
					...sMono,
					fontSize: 12,
					fontWeight: 700,
					color: projected != null && actual == null ? T.ink2 : T.ink
				}}>
					{`${currentYear}${projected != null && actual == null ? ' (proj.)' : ''} ${fmtCurrency(thisYear, currency)}`}
				</Typography>
			</Box>
		);
	}
	return null;
};

AnnualTooltip.propTypes = {
	active: PropTypes.bool,
	currency: PropTypes.string,
	currentYear: PropTypes.number,
	label: PropTypes.string,
	payload: PropTypes.array,
	T: PropTypes.object
};

function StatCell ({ label, value, sub, divider, T }) {
	return (
		<Box sx={{
			// Dividers only on md+ horizontal row; mobile wraps to 2x2 grid.
			borderLeft: { xs: 'none', md: divider ? `1px solid ${T.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)'}` : 'none' },
			paddingLeft: { xs: 0, md: divider ? '24px' : 0 },
			minWidth: 0
		}}>
			<Typography sx={{
				fontSize: 11,
				color: T.dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)',
				textTransform: 'uppercase',
				letterSpacing: '0.08em',
				fontWeight: 500
			}}>
				{label}
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
				{value}
			</Typography>
			{sub && (
				<Typography sx={{ ...sMono, fontSize: 11, color: T.dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
					{sub}
				</Typography>
			)}
		</Box>
	);
}

StatCell.propTypes = {
	divider: PropTypes.bool,
	label: PropTypes.string,
	sub: PropTypes.node,
	T: PropTypes.object,
	value: PropTypes.node
};

function Spending () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const accountList = useSelector((state) => state.accountList);
	const { currency, exchangeRate, livingExpenseExempt = [] } = useSelector((state) => state.settings);
	const T = useT();

	const dispatch = useDispatch();
	const [range, setRange] = useState('3M');
	const [livingExpenseOnly, setLivingExpenseOnly] = useState(true);
	const [projectionExpanded, setProjectionExpanded] = useState(false);
	const [txDialog, setTxDialog] = useState(null); // { mode: 'category'|'payee', key: string }

	const uncategorizedTxs = useMemo(() => {
		return allAccountsTransactions
			.filter(tx => {
				const type = tx.accountId ? tx.accountId.split(':')[1] : null;
				if (!EXPENSE_TYPES.includes(type)) return false;
				if (!tx.amount || tx.amount >= 0) return false;
				if (tx.category && tx.category !== '분류없음' && tx.category !== '') return false;
				return true;
			})
			.sort((a, b) => b.date.localeCompare(a.date))
			.slice(0, 30);
	}, [allAccountsTransactions]);

	const onCategoryBarClick = useCallback((data) => {
		setTxDialog({ mode: 'category', key: data.category });
	}, []);

	const onUncategorizedClick = (localIdx, tx) => {
		dispatch(openTransactionInModal({
			account: tx.account,
			date: tx.date,
			payee: tx.payee,
			category: tx.category || '',
			amount: tx.amount,
			memo: tx.memo,
			isEdit: true,
			index: localIdx
		}));
	};

	const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate !== 0) ? exchangeRate : 1;

	const accountCurrencyMap = useMemo(() => {
		const map = {};
		accountList.forEach(acc => { map[acc._id] = acc.currency || 'KRW'; });
		return map;
	}, [accountList]);

	const toDisplayAmount = useCallback((tx) => {
		const abs = Math.abs(tx.amount);
		const txCurrency = accountCurrencyMap[tx.accountId] || 'KRW';
		if (txCurrency === currency) return abs;
		if (txCurrency === 'KRW') return abs / validExchangeRate;
		return abs * validExchangeRate;
	}, [accountCurrencyMap, currency, validExchangeRate]);

	const isExpenseTx = useCallback((tx) => {
		if (!tx.amount || tx.amount >= 0) return false;
		const type = tx.accountId ? tx.accountId.split(':')[1] : null;
		if (!EXPENSE_TYPES.includes(type)) return false;
		if (!tx.category) return false;
		if (tx.category === NON_EXPENSE_CATEGORY) return false;
		if (tx.category.startsWith('[') && tx.category.endsWith(']')) return false;
		if (livingExpenseOnly) {
			const fullCategory = tx.subcategory ? `${tx.category}:${tx.subcategory}` : tx.category;
			if (livingExpenseExempt.some(j => fullCategory.startsWith(j))) return false;
		}
		return true;
	}, [livingExpenseOnly, livingExpenseExempt]);

	const spendingTransactions = useMemo(() => {
		const startMonthStr = getStartMonthStr(range);
		return allAccountsTransactions.filter(tx => {
			if (!isExpenseTx(tx)) return false;
			if (startMonthStr && tx.date.substring(0, 7) < startMonthStr) return false;
			return true;
		});
	}, [allAccountsTransactions, range, isExpenseTx]);

	const currentYear = new Date().getFullYear();
	const thisYearPrefix = `${currentYear}-`;
	const lastYearPrefix = `${currentYear - 1}-`;

	const lastYearTotal = useMemo(() => {
		return allAccountsTransactions
			.filter(tx => isExpenseTx(tx) && tx.date.startsWith(lastYearPrefix))
			.reduce((sum, tx) => sum + toDisplayAmount(tx), 0);
	}, [allAccountsTransactions, isExpenseTx, toDisplayAmount, lastYearPrefix]);

	const ytdTotal = useMemo(() => {
		return allAccountsTransactions
			.filter(tx => isExpenseTx(tx) && tx.date.startsWith(thisYearPrefix))
			.reduce((sum, tx) => sum + toDisplayAmount(tx), 0);
	}, [allAccountsTransactions, isExpenseTx, toDisplayAmount, thisYearPrefix]);

	const annualMonthlyData = useMemo(() => {
		const today = new Date();
		const month = today.getMonth();
		const dayOfMonth = today.getDate();
		const daysInCurrentMonth = new Date(currentYear, month + 1, 0).getDate();

		const thisYearMonthly = {};
		const lastYearMonthly = {};
		allAccountsTransactions.forEach(tx => {
			if (!isExpenseTx(tx)) return;
			const m = parseInt(tx.date.substring(5, 7)) - 1;
			if (tx.date.startsWith(thisYearPrefix)) {
				thisYearMonthly[m] = (thisYearMonthly[m] || 0) + toDisplayAmount(tx);
			} else if (tx.date.startsWith(lastYearPrefix)) {
				lastYearMonthly[m] = (lastYearMonthly[m] || 0) + toDisplayAmount(tx);
			}
		});

		return MONTH_LABELS.map((label, m) => {
			const lastYear = Math.round(lastYearMonthly[m] || 0);
			const actual = Math.round(thisYearMonthly[m] || 0);
			let projected = 0;
			if (m === month && dayOfMonth > 0) {
				const weight = dayOfMonth / daysInCurrentMonth;
				const currentPace = (actual / dayOfMonth) * daysInCurrentMonth;
				const historical = (lastYearMonthly[m] || 0) * INFLATION_RATE;
				projected = Math.max(0, Math.round(weight * currentPace + (1 - weight) * historical) - actual);
			} else if (m > month) {
				projected = Math.round((lastYearMonthly[m] || 0) * INFLATION_RATE);
			}
			return { month: label, lastYear, actual, projected };
		});
	}, [allAccountsTransactions, isExpenseTx, toDisplayAmount, thisYearPrefix, lastYearPrefix, currentYear]);

	const projectedAnnual = useMemo(() => {
		return Math.round(annualMonthlyData.reduce((sum, d) => sum + d.actual + d.projected, 0));
	}, [annualMonthlyData]);

	const cumulativeAnnualData = useMemo(() => {
		const currentMonth = new Date().getMonth();
		let cumLastYear = 0;
		let cumActual = 0;
		let cumProjected = 0;
		return annualMonthlyData.map((d, m) => {
			cumLastYear += d.lastYear;
			cumActual += d.actual;
			cumProjected += d.actual + d.projected;
			return {
				month: d.month,
				lastYear: Math.round(cumLastYear),
				actual: m <= currentMonth ? Math.round(cumActual) : null,
				projected: m >= currentMonth ? Math.round(cumProjected) : null
			};
		});
	}, [annualMonthlyData]);

	const annualChangeRate = lastYearTotal > 0
		? Math.round((projectedAnnual - lastYearTotal) / lastYearTotal * 100)
		: null;

	const monthlyData = useMemo(() => {
		const today = new Date();
		const currentMonthStr = `${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}`;
		const dayOfMonth = today.getDate();
		const daysInCurrentMonth = new Date(currentYear, today.getMonth() + 1, 0).getDate();

		const map = {};
		spendingTransactions.forEach(tx => {
			const month = tx.date.substring(0, 7);
			map[month] = (map[month] || 0) + toDisplayAmount(tx);
		});
		return Object.entries(map)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([month, total]) => {
				const actual = Math.round(total);
				if (month === currentMonthStr && dayOfMonth < daysInCurrentMonth) {
					const weight = dayOfMonth / daysInCurrentMonth;
					const currentPace = total / dayOfMonth * daysInCurrentMonth;
					const historical = (annualMonthlyData[today.getMonth()]?.lastYear || 0) * INFLATION_RATE;
					const projected = Math.max(0, Math.round(weight * currentPace + (1 - weight) * historical) - actual);
					return { month, actual, projected };
				}
				return { month, actual, projected: 0 };
			});
	}, [spendingTransactions, toDisplayAmount, currentYear, annualMonthlyData]);

	const categoryData = useMemo(() => {
		const map = {};
		spendingTransactions.forEach(tx => {
			const cat = (tx.category || '기타 지출').split(':')[0];
			map[cat] = (map[cat] || 0) + toDisplayAmount(tx);
		});
		return Object.entries(map)
			.map(([category, total]) => ({ category, total: Math.round(total) }))
			.sort((a, b) => b.total - a.total)
			.slice(0, 10);
	}, [spendingTransactions, toDisplayAmount]);

	const dialogTxns = useMemo(() => {
		if (!txDialog) return [];
		if (txDialog.mode === 'category') {
			return spendingTransactions
				.filter(tx => (tx.category || '기타 지출').split(':')[0] === txDialog.key)
				.sort((a, b) => b.date.localeCompare(a.date));
		}
		if (txDialog.mode === 'payee') {
			return spendingTransactions
				.filter(tx => (tx.payee || '(none)') === txDialog.key)
				.sort((a, b) => b.date.localeCompare(a.date));
		}
		return [];
	}, [spendingTransactions, txDialog]);

	const dialogTopCat = useMemo(() => {
		if (!txDialog || txDialog.mode !== 'payee' || !dialogTxns.length) return null;
		return (dialogTxns[0].category || '기타 지출').split(':')[0];
	}, [txDialog, dialogTxns]);

	const topPayees = useMemo(() => {
		const map = {};
		spendingTransactions.forEach(tx => {
			const payee = tx.payee || '(none)';
			const cat = (tx.category || '기타 지출').split(':')[0];
			const txCurrency = accountCurrencyMap[tx.accountId] || 'KRW';
			const abs = Math.abs(tx.amount);
			if (!map[payee]) map[payee] = { payee, total: 0, count: 0, categories: {}, native: {} };
			map[payee].total += toDisplayAmount(tx);
			map[payee].count += 1;
			map[payee].categories[cat] = (map[payee].categories[cat] || 0) + toDisplayAmount(tx);
			map[payee].native[txCurrency] = (map[payee].native[txCurrency] || 0) + abs;
		});
		return Object.values(map)
			.map(p => {
				const topCat = Object.entries(p.categories).sort((a, b) => b[1] - a[1])[0]?.[0];
				const nativeKeys = Object.keys(p.native);
				const singleCurrency = nativeKeys.length === 1 ? nativeKeys[0] : null;
				const displayTotal = singleCurrency
					? Math.round(p.native[singleCurrency])
					: Math.round(p.total);
				const displayCurrency = singleCurrency || currency;
				return {
					payee: p.payee,
					total: Math.round(p.total),
					displayTotal,
					displayCurrency,
					count: p.count,
					category: topCat
				};
			})
			.sort((a, b) => b.total - a.total)
			.slice(0, 10);
	}, [spendingTransactions, toDisplayAmount, accountCurrencyMap, currency]);

	const totalSpending = useMemo(() =>
		Math.round(spendingTransactions.reduce((sum, tx) => sum + toDisplayAmount(tx), 0)),
	[spendingTransactions, toDisplayAmount]);

	const avgMonthly = useMemo(() => {
		if (monthlyData.length === 0) return 0;
		return Math.round(totalSpending / monthlyData.length);
	}, [totalSpending, monthlyData]);

	const prevMonthTotal = useMemo(() => {
		const now = new Date();
		const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
		const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 7);
		const entry = monthlyData.find(d => d.month >= prevStart && d.month <= prevEnd);
		return entry ? entry.actual : 0;
	}, [monthlyData]);

	const thisMonthTotal = useMemo(() => {
		const now = new Date();
		const thisMonth = now.toISOString().slice(0, 7);
		const entry = monthlyData.find(d => d.month === thisMonth);
		return entry ? entry.actual : 0;
	}, [monthlyData]);

	const momChange = prevMonthTotal > 0
		? Math.round((thisMonthTotal - prevMonthTotal) / prevMonthTotal * 100)
		: null;

	const formatYAxis = makeFormatYAxis(currency);
	const barColor = T.acc.hero;
	const projectedBarColor = T.acc.bright;
	const categoryBarH = Math.min(categoryData.length * 38 + 20, 360);

	const panelSx = {
		background: T.surf,
		border: `1px solid ${T.rule}`,
		borderRadius: '16px',
		padding: { xs: '16px', md: '20px' },
		color: T.ink
	};

	const heroBg = T.dark
		? 'linear-gradient(135deg, #15151c 0%, #1d1d26 100%)'
		: `linear-gradient(135deg, ${T.acc.hero} 0%, ${T.acc.deep} 100%)`;
	const heroInk = '#ffffff';
	const heroDim = T.dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)';

	const projOver = annualChangeRate !== null && annualChangeRate > (INFLATION_RATE - 1) * 100;
	const sectionTitleSx = { ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 };
	const sectionTitleKoSx = { color: T.ink2, fontWeight: 400, fontSize: 12 };

	return (
		<DesignPage title="Spending" titleKo="지출">
			<Stack spacing={2}>
				{/* Transaction Review banner */}
				{uncategorizedTxs.length > 0 && (
					<Box sx={{
						background: T.surf,
						border: `1px solid ${T.dark ? 'rgba(251,146,60,0.4)' : 'rgba(154,52,18,0.3)'}`,
						borderRadius: '16px',
						overflow: 'hidden'
					}}>
						<Stack
							direction="row"
							alignItems="center"
							spacing={1}
							sx={{
								padding: '12px 16px',
								background: T.dark ? 'rgba(251,146,60,0.08)' : 'rgba(154,52,18,0.06)',
								borderBottom: `1px solid ${T.dark ? 'rgba(251,146,60,0.2)' : 'rgba(154,52,18,0.18)'}`
							}}
						>
							<WarningAmberOutlinedIcon sx={{ fontSize: 16, color: T.dark ? '#fb923c' : '#9a3412' }} />
							<Typography sx={{ ...sDisplay, fontSize: 13, fontWeight: 700, color: T.ink }}>
								Transaction Review
							</Typography>
							<Box sx={{
								padding: '2px 8px',
								borderRadius: '999px',
								background: T.dark ? 'rgba(251,146,60,0.18)' : 'rgba(154,52,18,0.12)',
								color: T.dark ? '#fb923c' : '#9a3412',
								fontSize: 11,
								fontWeight: 700,
								...sMono
							}}>
								{uncategorizedTxs.length}
							</Box>
							<Typography sx={{ fontSize: 11, color: T.ink2, marginLeft: 'auto !important' }}>
								Uncategorized expenses — click to edit
							</Typography>
						</Stack>
						<Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
							{uncategorizedTxs.map((tx, localIdx) => {
								const type = tx.accountId ? tx.accountId.split(':')[1] : null;
								const TypeIcon = TYPE_ICON_MAP[type];
								const txCur = accountCurrencyMap[tx.accountId] || 'KRW';
								return (
									<Box
										key={tx._id}
										onClick={() => onUncategorizedClick(localIdx, tx)}
										sx={{
											display: 'flex',
											alignItems: 'center',
											padding: '10px 16px',
											cursor: 'pointer',
											borderBottom: `1px solid ${T.rule}`,
											'&:last-child': { borderBottom: 'none' },
											'&:hover': { background: T.surf2 }
										}}
									>
										{TypeIcon && <TypeIcon sx={{ fontSize: 14, color: T.ink3, marginRight: '10px', flexShrink: 0 }} />}
										<Typography sx={{ ...sMono, fontSize: 11, color: T.ink2, width: 80, flexShrink: 0 }}>{tx.date}</Typography>
										<Typography sx={{
											flex: 1,
											fontSize: 13,
											color: T.ink,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap'
										}}>
											{tx.payee || '(none)'}
										</Typography>
										<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: T.neg }}>
											{fmtCurrencyFull(tx.amount, txCur)}
										</Typography>
									</Box>
								);
							})}
						</Box>
					</Box>
				)}

				{/* Hero panel — Annual outlook */}
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
					<Stack
						direction={{ xs: 'column', md: 'row' }}
						justifyContent="space-between"
						alignItems={{ xs: 'flex-start', md: 'flex-start' }}
						spacing={2}
						sx={{ position: 'relative' }}
					>
						<Box sx={{ minWidth: 0, flex: 1 }}>
							<Stack direction="row" alignItems="center" spacing={1}>
								<Typography sx={{
									fontSize: 11,
									color: heroDim,
									textTransform: 'uppercase',
									letterSpacing: '0.08em',
									fontWeight: 600
								}}>
									{currentYear} Projected · 연간 예측
								</Typography>
								<Typography sx={{ fontSize: 10, color: heroDim, opacity: 0.7 }}>· 2.5% inflation</Typography>
							</Stack>
							<Typography sx={{
								...sDisplay,
								fontSize: { xs: 36, sm: 48, md: 60 },
								fontWeight: 700,
								lineHeight: 1,
								marginTop: '14px',
								color: heroInk
							}}>
								{fmtCurrency(projectedAnnual, currency)}
							</Typography>
							{annualChangeRate !== null && (
								<Stack direction="row" alignItems="center" sx={{ marginTop: 1.5, flexWrap: 'wrap', columnGap: 1.25, rowGap: 0.5 }}>
									<Box sx={{
										color: projOver ? T.neg : T.pos,
										background: projOver ? T.negBg : T.posBg,
										padding: '0 12px',
										borderRadius: '999px',
										fontWeight: 600,
										fontSize: 13,
										minHeight: 28,
										display: 'inline-flex',
										alignItems: 'center',
										...sMono
									}}>
										{annualChangeRate > 0 ? '+' : ''}{annualChangeRate}%
									</Box>
									<Typography sx={{ ...sMono, color: heroDim, fontSize: 13, lineHeight: '28px' }}>
										vs {currentYear - 1} {fmtCurrency(lastYearTotal, currency)}
									</Typography>
								</Stack>
							)}
						</Box>

						{/* Range / Living toggle — left-aligned on mobile to avoid zigzag with the (left-aligned) hero text */}
						<Stack direction="column" spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }} sx={{ flexShrink: 0 }}>
							<Box
								onClick={() => setLivingExpenseOnly(v => !v)}
								sx={{
									cursor: 'pointer',
									padding: '4px 12px',
									borderRadius: '999px',
									fontSize: 11,
									fontWeight: 700,
									letterSpacing: '0.04em',
									textTransform: 'uppercase',
									background: livingExpenseOnly ? T.acc.bright : 'rgba(255,255,255,0.08)',
									color: livingExpenseOnly ? T.acc.deep : heroInk,
									border: `1px solid ${livingExpenseOnly ? T.acc.bright : 'rgba(255,255,255,0.18)'}`,
									transition: 'background 0.12s'
								}}
							>
								Living Expense
							</Box>
							<Stack
								direction="row"
								sx={{
									background: 'rgba(255,255,255,0.08)',
									border: '1px solid rgba(255,255,255,0.18)',
									borderRadius: '999px',
									padding: '3px',
									gap: '2px'
								}}
							>
								{RANGES.map(r => {
									const active = range === r;
									return (
										<Box
											key={r}
											onClick={() => setRange(r)}
											sx={{
												cursor: 'pointer',
												padding: '4px 10px',
												borderRadius: '999px',
												fontSize: 11,
												fontWeight: 700,
												...sMono,
												background: active ? '#fff' : 'transparent',
												color: active ? T.acc.deep : heroInk,
												transition: 'background 0.12s, color 0.12s',
												'&:hover': { background: active ? '#fff' : 'rgba(255,255,255,0.12)' }
											}}
										>
											{r}
										</Box>
									);
								})}
							</Stack>
						</Stack>
					</Stack>

					{/* 4-stat row */}
					<Box sx={{
						display: 'grid',
						gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
						gap: { xs: 2, md: 3 },
						marginTop: { xs: '24px', md: '32px' },
						position: 'relative'
					}}>
						<StatCell
							label={`YTD · ${currentYear}`}
							value={fmtCurrency(Math.round(ytdTotal), currency)}
							T={T}
						/>
						<StatCell
							label={`${range} Total`}
							value={fmtCurrency(totalSpending, currency)}
							T={T}
							divider
						/>
						<StatCell
							label="Monthly Avg"
							value={fmtCurrency(avgMonthly, currency)}
							T={T}
							divider
						/>
						<StatCell
							label="This Month"
							value={fmtCurrency(thisMonthTotal, currency)}
							sub={momChange !== null ? `${momChange > 0 ? '+' : ''}${momChange}% vs prev mo.` : null}
							T={T}
							divider
						/>
					</Box>
				</Box>

				{/* Annual cumulative trend (collapsible) */}
				{annualChangeRate !== null && (
					<Box sx={panelSx}>
						<Box
							onClick={() => setProjectionExpanded(v => !v)}
							sx={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
						>
							<Stack direction="row" alignItems="baseline" spacing={1}>
								<Typography sx={sectionTitleSx}>
									Annual cumulative
									<Box component="span" sx={sectionTitleKoSx}> · 누적 추이</Box>
								</Typography>
								<Typography sx={{ fontSize: 11, color: T.ink3 }}>
									{currentYear - 1} vs {currentYear}
								</Typography>
							</Stack>
							<ExpandMoreIcon
								sx={{
									fontSize: 20,
									color: T.ink2,
									transform: projectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
									transition: 'transform 0.2s'
								}}
							/>
						</Box>
						<Collapse in={projectionExpanded}>
							<Box sx={{ paddingTop: 1.5 }}>
								<Stack direction="row" spacing={2} sx={{ marginBottom: 1 }}>
									<Stack direction="row" alignItems="center" spacing={0.5}>
										<Box sx={{ width: 10, height: 10, borderRadius: '50%', background: T.ink3 }} />
										<Typography sx={{ fontSize: 11, color: T.ink2 }}>{currentYear - 1}</Typography>
									</Stack>
									<Stack direction="row" alignItems="center" spacing={0.5}>
										<Box sx={{ width: 10, height: 10, borderRadius: '50%', background: barColor }} />
										<Typography sx={{ fontSize: 11, color: T.ink2 }}>{currentYear} Actual</Typography>
									</Stack>
									<Stack direction="row" alignItems="center" spacing={0.5}>
										<Box sx={{ width: 10, height: 10, borderRadius: '50%', background: barColor, opacity: 0.4 }} />
										<Typography sx={{ fontSize: 11, color: T.ink2 }}>{currentYear} Projected</Typography>
									</Stack>
								</Stack>
								<Box sx={{ width: '100%', height: 220 }}>
									<ResponsiveContainer>
										<LineChart data={cumulativeAnnualData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
											<CartesianGrid strokeDasharray="3 3" stroke={T.rule} vertical={false} />
											<XAxis dataKey="month" tick={{ fontSize: 11, fill: T.ink2 }} axisLine={{ stroke: T.rule }} tickLine={false} />
											<YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: T.ink2 }} axisLine={{ stroke: T.rule }} tickLine={false} width={56} />
											<Tooltip content={<AnnualTooltip T={T} currency={currency} currentYear={currentYear} />} />
											<Line dataKey="lastYear" stroke={T.ink3} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
											<Line dataKey="actual" stroke={barColor} strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls />
											<Line dataKey="projected" stroke={barColor} strokeWidth={2} strokeDasharray="5 4" strokeOpacity={0.55} dot={false} isAnimationActive={false} connectNulls />
										</LineChart>
									</ResponsiveContainer>
								</Box>
							</Box>
						</Collapse>
					</Box>
				)}

				{/* Monthly trend */}
				<Box sx={panelSx}>
					<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ marginBottom: 1.5 }}>
						<Typography sx={sectionTitleSx}>
							Monthly trend
							<Box component="span" sx={sectionTitleKoSx}> · 월별 추이</Box>
						</Typography>
						<Typography sx={{ fontSize: 11, color: T.ink3 }}>{range} window</Typography>
					</Stack>
					<Box sx={{ width: '100%', height: 220 }}>
						<ResponsiveContainer>
							<BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" stroke={T.rule} vertical={false} />
								<XAxis dataKey="month" tick={{ fontSize: 11, fill: T.ink2 }} axisLine={{ stroke: T.rule }} tickLine={false} />
								<YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: T.ink2 }} axisLine={{ stroke: T.rule }} tickLine={false} width={56} />
								<Tooltip content={<ChartTooltip T={T} currency={currency} />} cursor={{ fill: T.surf2 }} />
								<Bar dataKey="actual" fill={barColor} radius={[0, 0, 0, 0]} stackId="stack" isAnimationActive={false} />
								<Bar dataKey="projected" fill={projectedBarColor} fillOpacity={0.45} radius={[3, 3, 0, 0]} stackId="stack" isAnimationActive={false} />
							</BarChart>
						</ResponsiveContainer>
					</Box>
				</Box>

				{/* 2-col: Category + Top payees */}
				<Box sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
					gap: 2
				}}>
					<Box sx={panelSx}>
						<Typography sx={{ ...sectionTitleSx, marginBottom: 1.5 }}>
							By category
							<Box component="span" sx={sectionTitleKoSx}> · 카테고리</Box>
						</Typography>
						{categoryData.length === 0 ? (
							<Box sx={{ padding: 3, textAlign: 'center' }}>
								<Typography sx={{ fontSize: 13, color: T.ink2 }}>No spending in this range</Typography>
							</Box>
						) : (
							<Box sx={{ width: '100%', height: categoryBarH }}>
								<ResponsiveContainer>
									<BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={T.rule} horizontal={false} />
										<XAxis type="number" tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: T.ink2 }} axisLine={{ stroke: T.rule }} tickLine={false} />
										<YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: T.ink }} axisLine={{ stroke: T.rule }} tickLine={false} width={84} />
										<Tooltip content={<ChartTooltip T={T} currency={currency} />} cursor={{ fill: T.surf2 }} />
										<Bar dataKey="total" radius={[0, 4, 4, 0]} onClick={onCategoryBarClick} cursor="pointer">
											{categoryData.map((entry) => (
												<Cell key={entry.category} fill={getCategoryColor(entry.category) || barColor} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</Box>
						)}
					</Box>

					<Box sx={panelSx}>
						<Typography sx={{ ...sectionTitleSx, marginBottom: 1.5 }}>
							Top payees
							<Box component="span" sx={sectionTitleKoSx}> · 주요 가맹점</Box>
						</Typography>
						{topPayees.length === 0 ? (
							<Box sx={{ padding: 3, textAlign: 'center' }}>
								<Typography sx={{ fontSize: 13, color: T.ink2 }}>No payees</Typography>
							</Box>
						) : (
							<Stack spacing={0}>
								<Stack
									direction="row"
									sx={{
										paddingY: 1,
										paddingX: 0.5,
										borderBottom: `1px solid ${T.rule}`
									}}
								>
									<Typography sx={{
										flex: 1,
										fontSize: 10,
										fontWeight: 600,
										textTransform: 'uppercase',
										letterSpacing: '0.06em',
										color: T.ink3
									}}>
										Payee
									</Typography>
									<Typography sx={{
										width: 60,
										textAlign: 'right',
										fontSize: 10,
										fontWeight: 600,
										textTransform: 'uppercase',
										letterSpacing: '0.06em',
										color: T.ink3
									}}>
										Count
									</Typography>
									<Typography sx={{
										width: 110,
										textAlign: 'right',
										fontSize: 10,
										fontWeight: 600,
										textTransform: 'uppercase',
										letterSpacing: '0.06em',
										color: T.ink3
									}}>
										Total
									</Typography>
								</Stack>
								{topPayees.map(({ payee, count, displayTotal, displayCurrency, category }) => {
									const catColor = getCategoryColor(category) || T.acc.hero;
									return (
										<Stack
											key={payee}
											direction="row"
											alignItems="center"
											onClick={() => setTxDialog({ mode: 'payee', key: payee })}
											sx={{
												paddingY: 1,
												paddingX: 0.5,
												cursor: 'pointer',
												borderBottom: `1px solid ${T.rule}`,
												'&:last-child': { borderBottom: 'none' },
												'&:hover': { background: T.surf2 }
											}}
										>
											<Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
												<Box sx={{ color: catColor, display: 'flex', flexShrink: 0 }}>
													{getCategoryIcon(category, 16)}
												</Box>
												<Typography sx={{
													fontSize: 13,
													color: T.ink,
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap'
												}}>
													{payee}
												</Typography>
											</Stack>
											<Typography sx={{ ...sMono, width: 60, textAlign: 'right', fontSize: 12, color: T.ink2 }}>
												{count}
											</Typography>
											<Typography sx={{ ...sMono, width: 110, textAlign: 'right', fontSize: 13, fontWeight: 600, color: T.ink }}>
												{fmtCurrency(displayTotal, displayCurrency)}
											</Typography>
										</Stack>
									);
								})}
							</Stack>
						)}
					</Box>
				</Box>

				{/* Heatmap */}
				<Box sx={panelSx}>
					<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ marginBottom: 1.5 }}>
						<Typography sx={sectionTitleSx}>
							Pattern
							<Box component="span" sx={sectionTitleKoSx}> · 지출 패턴</Box>
						</Typography>
						<Typography sx={{ fontSize: 11, color: T.ink3 }}>최근 13주</Typography>
					</Stack>
					<Box sx={{ display: 'flex', justifyContent: 'center' }}>
						<Box sx={{ width: 360, maxWidth: '100%' }}>
							<SpendingHeatmap />
						</Box>
					</Box>
				</Box>
			</Stack>

			<BankTransactionModal transactions={uncategorizedTxs} />

			{/* Category / Payee transactions dialog */}
			<Dialog
				open={!!txDialog}
				onClose={() => setTxDialog(null)}
				maxWidth="sm"
				fullWidth
				PaperProps={{
					style: {
						background: T.surf,
						color: T.ink,
						border: `1px solid ${T.rule}`,
						borderRadius: 16,
						backgroundImage: 'none'
					}
				}}
			>
				<DialogTitle sx={{ paddingY: 1.5 }}>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Stack direction="row" alignItems="center" spacing={1}>
							{txDialog?.mode === 'category' && (
								<Box sx={{ color: getCategoryColor(txDialog.key) || T.acc.hero, display: 'flex' }}>
									{getCategoryIcon(txDialog.key, 20)}
								</Box>
							)}
							{txDialog?.mode === 'payee' && dialogTopCat && (
								<Box sx={{ color: getCategoryColor(dialogTopCat) || T.acc.hero, display: 'flex' }}>
									{getCategoryIcon(dialogTopCat, 20)}
								</Box>
							)}
							<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink }}>
								{txDialog?.mode === 'payee' ? (dialogTopCat || txDialog?.key) : txDialog?.key}
							</Typography>
							<Typography sx={{ fontSize: 12, color: T.ink2 }}>({dialogTxns.length})</Typography>
						</Stack>
						<Stack direction="row" alignItems="center" spacing={0.5}>
							<Typography sx={{ ...sMono, fontSize: 14, fontWeight: 700, color: T.ink }}>
								{fmtCurrencyFull(Math.round(dialogTxns.reduce((s, tx) => s + toDisplayAmount(tx), 0)), currency)}
							</Typography>
							<IconButton size="small" onClick={() => setTxDialog(null)} sx={{ color: T.ink2 }}>
								<CloseIcon fontSize="small" />
							</IconButton>
						</Stack>
					</Stack>
				</DialogTitle>
				<DialogContent sx={{ padding: 0, borderTop: `1px solid ${T.rule}` }}>
					{dialogTxns.map(tx => {
						const type = tx.accountId ? tx.accountId.split(':')[1] : null;
						const TypeIcon = TYPE_ICON_MAP[type];
						const txCur = accountCurrencyMap[tx.accountId] || 'KRW';
						return (
							<Box
								key={tx._id}
								sx={{
									display: 'flex',
									alignItems: 'center',
									paddingX: 2,
									paddingY: 1,
									borderBottom: `1px solid ${T.rule}`,
									'&:last-child': { borderBottom: 'none' }
								}}
							>
								<Box sx={{ flex: 1, overflow: 'hidden' }}>
									<Typography sx={{
										fontSize: 13,
										color: T.ink,
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap'
									}}>
										{tx.payee || '(none)'}
									</Typography>
									<Stack direction="row" alignItems="center" spacing={0.5} sx={{ marginTop: '2px' }}>
										{TypeIcon && <TypeIcon sx={{ fontSize: 12, color: T.ink3 }} />}
										<Typography sx={{ fontSize: 11, color: T.ink3 }}>
											{tx.account || tx.accountId?.split(':')[2] || ''}
										</Typography>
									</Stack>
								</Box>
								<Stack alignItems="flex-end" spacing={0}>
									<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: T.neg }}>
										{fmtCurrencyFull(tx.amount, txCur)}
									</Typography>
									<Typography sx={{ ...sMono, fontSize: 11, color: T.ink3 }}>{tx.date}</Typography>
								</Stack>
							</Box>
						);
					})}
				</DialogContent>
			</Dialog>
		</DesignPage>
	);
}

export default Spending;
