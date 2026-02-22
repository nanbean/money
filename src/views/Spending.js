import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
	BarChart,
	Bar,
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

import Paper from '@mui/material/Paper';

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

function Spending () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const accountList = useSelector((state) => state.accountList);
	const { currency, exchangeRate, livingExpenseExempt = [] } = useSelector((state) => state.settings);
	const theme = useTheme();

	const dispatch = useDispatch();
	const [range, setRange] = useState('3M');
	const [livingExpenseOnly, setLivingExpenseOnly] = useState(true);

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

	const projectedAnnual = useMemo(() => {
		const today = new Date();
		const month = today.getMonth(); // 0-indexed current month
		const dayOfMonth = today.getDate();
		const daysInCurrentMonth = new Date(currentYear, month + 1, 0).getDate();

		// Aggregate monthly spending for this year and last year
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

		// Sum of completed months (Jan to previous month)
		let completedThisYear = 0;
		for (let m = 0; m < month; m++) {
			completedThisYear += thisYearMonthly[m] || 0;
		}

		// Current month: extrapolate to end of month at current pace
		const currentMonthActual = thisYearMonthly[month] || 0;
		const currentMonthProjected = dayOfMonth > 0 ? (currentMonthActual / dayOfMonth) * daysInCurrentMonth : 0;

		// Remaining months: last year same month × inflation rate (2%)
		const INFLATION_RATE = 1.02;
		let remainingProjected = 0;
		for (let m = month + 1; m <= 11; m++) {
			remainingProjected += (lastYearMonthly[m] || 0) * INFLATION_RATE;
		}

		return Math.round(completedThisYear + currentMonthProjected + remainingProjected);
	}, [allAccountsTransactions, isExpenseTx, toDisplayAmount, thisYearPrefix, lastYearPrefix, currentYear]);

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
					const projected = Math.round(total / dayOfMonth * daysInCurrentMonth) - actual;
					return { month, actual, projected };
				}
				return { month, actual, projected: 0 };
			});
	}, [spendingTransactions, toDisplayAmount, currentYear]);

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
							label="Living Expense Only"
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
								<ToggleButton key={r} value={r} sx={{ px: 1.5 }}>{r}</ToggleButton>
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
					<Box sx={{ mb: 3, p: 1.5, borderRadius: 1, border: '1px solid', borderColor: annualChangeRate > 0 ? 'error.main' : 'success.main', bgcolor: 'background.paper' }}>
						<Stack direction="row" alignItems="flex-start" justifyContent="space-between">
							<Box>
								<Stack direction="row" alignItems="center" spacing={0.75}>
									<Typography variant="caption" color="text.secondary">{currentYear} Annual Projection</Typography>
									<Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>· 2% inflation applied</Typography>
								</Stack>
								<Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.25 }}>
									<Amount value={projectedAnnual} currency={currency} showSymbol size="large" showColor={false} />
									<Chip
										label={`${annualChangeRate > 0 ? '+' : ''}${annualChangeRate}% vs last year`}
										size="small"
										color={annualChangeRate > 0 ? 'error' : 'success'}
										sx={{ height: 20, fontSize: 11 }}
									/>
								</Stack>
								<Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
									<Typography variant="caption" color="text.disabled">YTD Actual</Typography>
									<Amount value={Math.round(ytdTotal)} currency={currency} showSymbol size="small" showColor={false} />
								</Stack>
							</Box>
							<Box sx={{ textAlign: 'right' }}>
								<Typography variant="caption" color="text.secondary">{currentYear - 1} Actual</Typography>
								<Amount value={Math.round(lastYearTotal)} currency={currency} showSymbol size="large" showColor={false} />
							</Box>
						</Stack>
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
							<Bar dataKey="total" radius={[0, 3, 3, 0]}>
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
								<TableRow key={payee} hover>
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
		</Layout>
	);
}

export default Spending;
