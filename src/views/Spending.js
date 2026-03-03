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
import { useTheme } from '@mui/material/styles';
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

import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';

import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import Layout from '../components/Layout';
import Amount from '../components/Amount';
import BankTransactionModal from '../components/BankTransactionModal';
import { openTransactionInModal } from '../actions/ui/form/bankTransaction';
import { getCategoryColor } from '../utils/categoryColor';
import { getCategoryIcon } from '../utils/categoryIcon';
import { toCurrencyFormatWithSymbol } from '../utils/formatting';
import { NON_EXPENSE_CATEGORY, TYPE_ICON_MAP } from '../constants';

const RANGES = ['1M', '3M', '6M', 'YTD', '1Y'];
const EXPENSE_TYPES = ['Bank', 'CCard', 'Cash'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const INFLATION_RATE = 1.025;

// Returns start month string (YYYY-MM) for the given range
const getStartMonthStr = (range) => {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth(); // 0-indexed
	switch (range) {
	case '1M': return new Date(year, month, 1).toISOString().slice(0, 7);       // current month only
	case '3M': return new Date(year, month - 2, 1).toISOString().slice(0, 7);   // 3 months
	case '6M': return new Date(year, month - 5, 1).toISOString().slice(0, 7);   // 6 months
	case 'YTD': return `${year}-01`;                                              // Jan to current month
	case '1Y': return new Date(year, month - 12, 1).toISOString().slice(0, 7);  // 12 months
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

const ChartTooltip = ({ active, payload, label, currency }) => {
	if (active && payload && payload.length) {
		const actual = payload.find(p => p.dataKey === 'actual')?.value ?? payload[0].value;
		const projected = payload.find(p => p.dataKey === 'projected')?.value ?? 0;
		return (
			<Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, boxShadow: 3 }}>
				<Typography variant="caption" color="text.secondary">{label}</Typography>
				{projected > 0 ? (
					<>
						<Typography variant="body2">{`Actual: ${toCurrencyFormatWithSymbol(actual, currency)}`}</Typography>
						<Typography variant="body2" color="text.secondary">{`Projected: ${toCurrencyFormatWithSymbol(actual + projected, currency)}`}</Typography>
					</>
				) : (
					<Typography variant="body2" fontWeight="bold">{toCurrencyFormatWithSymbol(actual, currency)}</Typography>
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
	payload: PropTypes.array
};

const AnnualTooltip = ({ active, payload, label, currency, currentYear }) => {
	if (active && payload && payload.length) {
		const lastYear = payload.find(p => p.dataKey === 'lastYear')?.value ?? 0;
		const actual = payload.find(p => p.dataKey === 'actual')?.value;
		const projected = payload.find(p => p.dataKey === 'projected')?.value;
		const thisYear = actual ?? projected ?? 0;
		return (
			<Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, boxShadow: 3 }}>
				<Typography variant="caption" color="text.secondary">{label} (Cumulative)</Typography>
				<Typography variant="body2" color="text.disabled">{`${currentYear - 1}: ${toCurrencyFormatWithSymbol(lastYear, currency)}`}</Typography>
				<Typography variant="body2" fontWeight="bold" color={projected != null && actual == null ? 'text.secondary' : 'text.primary'}>
					{`${currentYear}${projected != null && actual == null ? ' (proj.)' : ''}: ${toCurrencyFormatWithSymbol(thisYear, currency)}`}
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
	payload: PropTypes.array
};

function Spending () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const accountList = useSelector((state) => state.accountList);
	const { currency, exchangeRate, livingExpenseExempt = [] } = useSelector((state) => state.settings);
	const theme = useTheme();

	const dispatch = useDispatch();
	const [range, setRange] = useState('3M');
	const [livingExpenseOnly, setLivingExpenseOnly] = useState(true);
	const [projectionExpanded, setProjectionExpanded] = useState(false);
	const [txDialog, setTxDialog] = useState(null); // { mode: 'category'|'payee', key: string }

	// Uncategorized transactions (all time, Bank/CCard/Cash, expenses)
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
			if (!map[payee]) map[payee] = { payee, total: 0, count: 0, categories: {} };
			map[payee].total += toDisplayAmount(tx);
			map[payee].count += 1;
			map[payee].categories[cat] = (map[payee].categories[cat] || 0) + toDisplayAmount(tx);
		});
		return Object.values(map)
			.map(p => {
				const topCat = Object.entries(p.categories).sort((a, b) => b[1] - a[1])[0]?.[0];
				return { payee: p.payee, total: Math.round(p.total), count: p.count, category: topCat };
			})
			.sort((a, b) => b.total - a.total)
			.slice(0, 10);
	}, [spendingTransactions, toDisplayAmount]);

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
	const barColor = theme.palette.mode === 'dark' ? '#5e9cd4' : '#4472c4';
	const categoryBarH = Math.min(categoryData.length * 38 + 20, 360);

	return (
		<Layout showPaper={false} title="Spending">
			<Box sx={{ p: { xs: 1, sm: 2 } }}>

				{/* Transaction Review */}
				{uncategorizedTxs.length > 0 && (
					<Paper
						elevation={0}
						variant="outlined"
						sx={{ mb: 3, borderColor: 'warning.main', borderRadius: 2, overflow: 'hidden' }}
					>
						<Stack
							direction="row"
							alignItems="center"
							spacing={1}
							sx={{ px: 2, py: 1.5, bgcolor: 'rgba(255, 152, 0, 0.08)', borderBottom: '1px solid', borderColor: 'warning.main' }}
						>
							<Typography variant="subtitle2" fontWeight="bold">Transaction Review</Typography>
							<Chip label={uncategorizedTxs.length} size="small" color="warning" sx={{ height: 20, fontSize: 11 }} />
							<Typography variant="caption" color="text.secondary" sx={{ ml: 'auto !important' }}>Uncategorized expenses — click to edit</Typography>
						</Stack>
						{uncategorizedTxs.map((tx, localIdx) => {
							const type = tx.accountId ? tx.accountId.split(':')[1] : null;
							const TypeIcon = TYPE_ICON_MAP[type];
							return (
								<Box
									key={tx._id}
									onClick={() => onUncategorizedClick(localIdx, tx)}
									sx={{
										display: 'flex',
										alignItems: 'center',
										px: 2,
										py: 1,
										cursor: 'pointer',
										borderBottom: '1px solid',
										borderColor: 'divider',
										'&:last-child': { borderBottom: 'none' },
										'&:hover': { bgcolor: 'action.hover' }
									}}
								>
									{TypeIcon && <TypeIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1, flexShrink: 0 }} />}
									<Typography variant="body2" color="text.secondary" sx={{ width: 80, flexShrink: 0 }}>{tx.date}</Typography>
									<Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{tx.payee || '(none)'}
									</Typography>
									<Amount value={tx.amount} currency={accountCurrencyMap[tx.accountId] || 'KRW'} showSymbol negativeColor />
								</Box>
							);
						})}
					</Paper>
				)}

				{/* Header */}
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
					<Typography variant="caption" color="text.secondary">Spending</Typography>
					<Stack direction="row" alignItems="center" spacing={1}>
						<Chip
							label="Living Expense"
							size="small"
							onClick={() => setLivingExpenseOnly(v => !v)}
							color={livingExpenseOnly ? 'primary' : 'default'}
							variant={livingExpenseOnly ? 'filled' : 'outlined'}
						/>
						<ToggleButtonGroup
							value={range}
							exclusive
							onChange={(_, v) => v && setRange(v)}
							size="small"
						>
							{RANGES.map(r => (
								<ToggleButton key={r} value={r} sx={{ px: 0.8, py: 0.25, fontSize: 12 }}>{r}</ToggleButton>
							))}
						</ToggleButtonGroup>
					</Stack>
				</Stack>

				{/* Summary cards */}
				<Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
					<Box sx={{ flex: 1, p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
						<Typography variant="caption" color="text.secondary">Total</Typography>
						<Amount value={totalSpending} currency={currency} showSymbol size="large" showColor={false} />
					</Box>
					<Box sx={{ flex: 1, p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
						<Typography variant="caption" color="text.secondary">Monthly Avg</Typography>
						<Amount value={avgMonthly} currency={currency} showSymbol size="large" showColor={false} />
					</Box>
					<Box sx={{ flex: 1, p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
						<Typography variant="caption" color="text.secondary">This Month</Typography>
						<Amount value={thisMonthTotal} currency={currency} showSymbol size="large" showColor={false} />
						{momChange !== null && (
							<Chip
								label={`${momChange > 0 ? '+' : ''}${momChange}% vs prev mo.`}
								size="small"
								color={momChange > 0 ? 'error' : 'success'}
								sx={{ mt: 0.5, height: 18, fontSize: 10 }}
							/>
						)}
					</Box>
				</Stack>

				{/* Annual projection vs last year */}
				{annualChangeRate !== null && (
					<Box sx={{ mb: 3, borderRadius: 1, border: '1px solid', borderColor: annualChangeRate > (INFLATION_RATE - 1) * 100 ? 'error.main' : 'success.main', bgcolor: 'background.paper', overflow: 'hidden' }}>
						<Box
							onClick={() => setProjectionExpanded(v => !v)}
							sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
						>
							<Stack direction="row" alignItems="flex-start" justifyContent="space-between">
								<Box>
									<Stack direction="row" alignItems="center" spacing={0.75}>
										<Typography variant="caption" color="text.secondary">{currentYear} Annual Projection</Typography>
										<Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>· 2.5% inflation applied</Typography>
									</Stack>
									<Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.25 }}>
										<Amount value={projectedAnnual} currency={currency} showSymbol size="large" showColor={false} />
										<Chip
											label={`${annualChangeRate > 0 ? '+' : ''}${annualChangeRate}% vs last year`}
											size="small"
											color={annualChangeRate > (INFLATION_RATE - 1) * 100 ? 'error' : 'success'}
											sx={{ height: 20, fontSize: 11 }}
										/>
									</Stack>
									<Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
										<Typography variant="caption" color="text.disabled">YTD Actual</Typography>
										<Amount value={Math.round(ytdTotal)} currency={currency} showSymbol size="small" showColor={false} />
									</Stack>
								</Box>
								<Stack direction="column" alignItems="flex-end" spacing={0.5}>
									<Box sx={{ textAlign: 'right' }}>
										<Typography variant="caption" color="text.secondary">{currentYear - 1} Actual</Typography>
										<Amount value={Math.round(lastYearTotal)} currency={currency} showSymbol size="large" showColor={false} />
									</Box>
									<ExpandMoreIcon
										sx={{
											fontSize: 18,
											color: 'text.secondary',
											transform: projectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
											transition: 'transform 0.2s'
										}}
									/>
								</Stack>
							</Stack>
						</Box>
						<Collapse in={projectionExpanded}>
							<Box sx={{ px: 1.5, pb: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
								<Stack direction="row" spacing={2} sx={{ mt: 1, mb: 0.5 }}>
									<Stack direction="row" alignItems="center" spacing={0.5}>
										<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'text.disabled' }} />
										<Typography variant="caption" color="text.secondary">{currentYear - 1}</Typography>
									</Stack>
									<Stack direction="row" alignItems="center" spacing={0.5}>
										<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: barColor }} />
										<Typography variant="caption" color="text.secondary">{currentYear} Actual</Typography>
									</Stack>
									<Stack direction="row" alignItems="center" spacing={0.5}>
										<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: barColor, opacity: 0.35 }} />
										<Typography variant="caption" color="text.secondary">{currentYear} Projected</Typography>
									</Stack>
								</Stack>
								<Box sx={{ height: 200, minWidth: 0 }}>
									<ResponsiveContainer width="100%" height="100%">
										<LineChart data={cumulativeAnnualData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
											<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
											<XAxis dataKey="month" tick={{ fontSize: 10 }} />
											<YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} width={56} />
											<Tooltip content={<AnnualTooltip currency={currency} currentYear={currentYear} />} />
											<Line dataKey="lastYear" stroke={theme.palette.text.disabled} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
											<Line dataKey="actual" stroke={barColor} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
											<Line dataKey="projected" stroke={barColor} strokeWidth={2} strokeDasharray="5 4" strokeOpacity={0.6} dot={false} isAnimationActive={false} connectNulls />
										</LineChart>
									</ResponsiveContainer>
								</Box>
							</Box>
						</Collapse>
					</Box>
				)}

				{/* Monthly trend */}
				<Typography variant="caption" color="text.secondary">Monthly Spending</Typography>
				<Box sx={{ height: 200, mt: 0.5, mb: 3, minWidth: 0, overflow: 'hidden' }}>
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
							<XAxis dataKey="month" tick={{ fontSize: 10 }} />
							<YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} width={56} />
							<Tooltip content={<ChartTooltip currency={currency} />} />
							<Bar dataKey="actual" fill={barColor} radius={[0, 0, 0, 0]} stackId="stack" isAnimationActive={false} />
							<Bar dataKey="projected" fill={barColor} fillOpacity={0.35} radius={[3, 3, 0, 0]} stackId="stack" isAnimationActive={false} />
						</BarChart>
					</ResponsiveContainer>
				</Box>

				<Divider sx={{ mb: 2 }} />

				{/* Category breakdown */}
				<Typography variant="caption" color="text.secondary">Spending by Category</Typography>
				<Box sx={{ height: categoryBarH, mt: 0.5, mb: 3, minWidth: 0, overflow: 'hidden' }}>
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} horizontal={false} />
							<XAxis type="number" tickFormatter={formatYAxis} tick={{ fontSize: 10 }} />
							<YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={76} />
							<Tooltip content={<ChartTooltip currency={currency} />} />
							<Bar dataKey="total" radius={[0, 3, 3, 0]} onClick={onCategoryBarClick} cursor="pointer">
								{categoryData.map((entry) => (
									<Cell key={entry.category} fill={getCategoryColor(entry.category) || barColor} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</Box>

				<Divider sx={{ mb: 2 }} />

				{/* Top payees */}
				<Typography variant="caption" color="text.secondary">Top Payees</Typography>
				<Table size="small" sx={{ mt: 0.5 }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ color: 'text.secondary', fontSize: 11 }}>Payee</TableCell>
							<TableCell align="right" sx={{ color: 'text.secondary', fontSize: 11 }}>Count</TableCell>
							<TableCell align="right" sx={{ color: 'text.secondary', fontSize: 11 }}>Total</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{topPayees.map(({ payee, count, total, category }) => {
							const catColor = getCategoryColor(category) || barColor;
							return (
								<TableRow key={payee} hover sx={{ cursor: 'pointer' }} onClick={() => setTxDialog({ mode: 'payee', key: payee })}>
									<TableCell>
										<Stack direction="row" alignItems="center" spacing={1}>
											<Box sx={{ color: catColor, display: 'flex', flexShrink: 0 }}>{getCategoryIcon(category, 16)}</Box>
											<Typography variant="body2" sx={{ color: catColor }}>{payee}</Typography>
										</Stack>
									</TableCell>
									<TableCell align="right">
										<Typography variant="body2" color="text.secondary">{count}</Typography>
									</TableCell>
									<TableCell align="right">
										<Amount value={total} currency={currency} showSymbol showColor={false} />
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>

			</Box>
			<BankTransactionModal transactions={uncategorizedTxs} />
			{/* Category / Payee transactions dialog */}
			<Dialog
				open={!!txDialog}
				onClose={() => setTxDialog(null)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle sx={{ py: 1.5 }}>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Stack direction="row" alignItems="center" spacing={1}>
							{txDialog?.mode === 'category' && (
								<Box sx={{ color: getCategoryColor(txDialog.key) || barColor, display: 'flex' }}>
									{getCategoryIcon(txDialog.key, 20)}
								</Box>
							)}
							{txDialog?.mode === 'payee' && dialogTopCat && (
								<Box sx={{ color: getCategoryColor(dialogTopCat) || barColor, display: 'flex' }}>
									{getCategoryIcon(dialogTopCat, 20)}
								</Box>
							)}
							<Typography variant="subtitle1" fontWeight="bold">{txDialog?.mode === 'payee' ? (dialogTopCat || txDialog?.key) : txDialog?.key}</Typography>
							<Typography variant="body2" color="text.secondary">({dialogTxns.length})</Typography>
						</Stack>
						<Stack direction="row" alignItems="center" spacing={0.5}>
							<Amount
								value={Math.round(dialogTxns.reduce((s, tx) => s + toDisplayAmount(tx), 0))}
								currency={currency}
								showSymbol
								showColor={false}
							/>
							<IconButton size="small" onClick={() => setTxDialog(null)}>
								<CloseIcon fontSize="small" />
							</IconButton>
						</Stack>
					</Stack>
				</DialogTitle>
				<DialogContent dividers sx={{ p: 0 }}>
					{dialogTxns.map(tx => {
						const type = tx.accountId ? tx.accountId.split(':')[1] : null;
						const TypeIcon = TYPE_ICON_MAP[type];
						return (
							<Box
								key={tx._id}
								sx={{
									display: 'flex',
									alignItems: 'center',
									px: 2,
									py: 1,
									borderBottom: '1px solid',
									borderColor: 'divider',
									'&:last-child': { borderBottom: 'none' }
								}}
							>
								<Box sx={{ flex: 1, overflow: 'hidden' }}>
									<Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{tx.payee || '(none)'}
									</Typography>
									<Stack direction="row" alignItems="center" spacing={0.5}>
										{TypeIcon && <TypeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />}
										<Typography variant="caption" color="text.disabled">
											{tx.account || tx.accountId?.split(':')[2] || ''}
										</Typography>
									</Stack>
								</Box>
								<Stack alignItems="flex-end" spacing={0}>
									<Amount value={tx.amount} currency={accountCurrencyMap[tx.accountId] || 'KRW'} showSymbol negativeColor />
									<Typography variant="caption" color="text.disabled">{tx.date}</Typography>
								</Stack>
							</Box>
						);
					})}
				</DialogContent>
			</Dialog>
		</Layout>
	);
}

export default Spending;
