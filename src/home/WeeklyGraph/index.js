import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

import { useTheme } from '@mui/material/styles';

import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	Cell,
	CartesianGrid
} from 'recharts';

import SortMenuButton from '../../components/SortMenuButton';
import { updateGeneralAction } from '../../actions/couchdbSettingActions';

import { getCategoryColor } from '../../utils/categoryColor';
import { toCurrencyFormat } from '../../utils/formatting';

const week = [
	'Day1',
	'Day2',
	'Day3',
	'Day4',
	'Day5',
	'Day6',
	'Day7'
];

const expenseCategories = [
	'교통비',
	'식비',
	'의료비',
	'교육',
	'육아',
	'생활용품비',
	'의류',
	'대출이자',
	'공과금',
	'미용',
	'보험',
	'수수료',
	'통신비',
	'회비',
	'취미-레저',
	'문화생활',
	'기타 지출',
	'경조사-선물',
	'실제지출아님'
];

const getData = (weekData, transactions, displayCurrency, exchangeRate, accountList) => {
	const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate !== 0) ? exchangeRate : 1;

	return weekData.map((_, index) => {
		const day = moment().subtract(6 - index, 'days').format('YYYY-MM-DD');
		const dayofWeek = moment().subtract(6 - index, 'days').format('ddd');
		const dailyExpenses = {};
		expenseCategories.forEach(category => {
			dailyExpenses[category] = 0;
		});

		for (let k = 0; k < transactions.length; k++) {
			const transaction = transactions[k];
			if (day === transaction.date && transaction.amount < 0) {
				let amount = Math.abs(parseInt(transaction.amount, 10));
				const accountDetails = accountList.find(acc => acc._id === transaction.accountId);
				const transactionOriginalCurrency = accountDetails ? accountDetails.currency : 'KRW';

				if (displayCurrency && transactionOriginalCurrency !== displayCurrency) {
					if (displayCurrency === 'KRW') {
						if (transactionOriginalCurrency === 'USD') {
							amount *= validExchangeRate;
						}
					} else if (displayCurrency === 'USD') {
						if (transactionOriginalCurrency === 'KRW') {
							amount /= validExchangeRate;
						}
					}
				}

				const primaryCategory = transaction.category.split(':')[0];
				if (expenseCategories.includes(primaryCategory)) {
					dailyExpenses[primaryCategory] += amount;
				}
			}
		}
		return {
			dayofWeek,
			...dailyExpenses
		};
	});
};

const getCategoryData = (transactions, displayCurrency, exchangeRate, accountList) => {
	const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate > 0) ? exchangeRate : 1;
	const categoryExpenses = expenseCategories.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {});

	for (const transaction of transactions) {
		if (transaction.amount < 0) {
			let amount = Math.abs(parseInt(transaction.amount, 10));
			const accountDetails = accountList.find(acc => acc._id === transaction.accountId);
			const transactionOriginalCurrency = accountDetails ? accountDetails.currency : 'KRW';

			if (displayCurrency && transactionOriginalCurrency !== displayCurrency) {
				if (displayCurrency === 'KRW' && transactionOriginalCurrency === 'USD') {
					amount *= validExchangeRate;
				} else if (displayCurrency === 'USD' && transactionOriginalCurrency === 'KRW') {
					amount /= validExchangeRate;
				}
			}

			const primaryCategory = transaction.category.split(':')[0];
			if (expenseCategories.includes(primaryCategory)) {
				categoryExpenses[primaryCategory] += amount;
			}
		}
	}

	return Object.entries(categoryExpenses)
		.map(([category, amount]) => ({ category, amount }))
		.filter(item => item.amount > 0)
		.sort((a, b) => b.amount - a.amount);
};

const CustomTooltip = ({ active, payload, label, chartType, currency }) => {
	if (active && payload && payload.length) {
		return (
			<Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, minWidth: 150, boxShadow: 3 }}>
				<Typography variant="subtitle2" gutterBottom>{label}</Typography>
				{chartType === 'weekly' ? (
					<>
						{payload.sort((a, b) => b.value - a.value).map(entry => (
							<Stack key={entry.dataKey} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
								<Stack direction="row" spacing={0.5} alignItems="center">
									<Box sx={{ width: 10, height: 10, bgcolor: entry.fill, borderRadius: '2px' }} />
									<Typography variant="caption">{entry.name}</Typography>
								</Stack>
								<Typography variant="caption">{toCurrencyFormat(entry.value, currency)}</Typography>
							</Stack>
						))}
						<Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1, textAlign: 'right' }}>
							Total: {toCurrencyFormat(payload.reduce((sum, entry) => sum + entry.value, 0), currency)}
						</Typography>
					</>
				) : (
					<Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
						<Typography variant="caption">Amount:</Typography>
						<Typography variant="caption">{toCurrencyFormat(payload[0].value, currency)}</Typography>
					</Stack>
				)}
			</Box>
		);
	}
	return null;
};

CustomTooltip.propTypes = {
	active: PropTypes.bool,
	chartType: PropTypes.string,
	currency: PropTypes.string,
	label: PropTypes.string,
	payload: PropTypes.array
};

export function WeeklyGraph () {
	const weeklyTransactions = useSelector((state) => state.weeklyTransactions);
	const { weeklyGraphAccount : weeklyGraphAccountSettings } = useSelector((state) => state.settings);
	const { currency: displayCurrency, exchangeRate } = useSelector((state) => state.settings);
	const accountList = useSelector((state) => state.accountList);
	const theme = useTheme();
	const { weeklyGraphChartType = 'weekly' } = useSelector((state) => state.settings);
	const dispatch = useDispatch();

	const handleChartTypeChange = (newChartType) => {
		dispatch(updateGeneralAction('weeklyGraphChartType', newChartType));
	};

	const filteredTransactions = useMemo(() => {
		const accountsToFilter = Array.isArray(weeklyGraphAccountSettings) ? weeklyGraphAccountSettings : [];
		if (accountsToFilter.length === 0) return [];
		return accountsToFilter.reduce((total, accName) => [...total, ...weeklyTransactions.filter(j => j.account === accName)], []);
	}, [weeklyTransactions, weeklyGraphAccountSettings]);

	const data = useMemo(() => {
		if (!displayCurrency || typeof exchangeRate === 'undefined' || exchangeRate === null || !accountList || accountList.length === 0) {
			if (weeklyGraphChartType === 'category') return [];
			return week.map((_, index) => {
				const dayofWeek = moment().subtract(6 - index, 'days').format('ddd');
				const zeroedExpenses = expenseCategories.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {});
				return { dayofWeek, ...zeroedExpenses };
			});
		}
		if (weeklyGraphChartType === 'category') {
			return getCategoryData(filteredTransactions, displayCurrency, exchangeRate, accountList);
		}
		return getData(week, filteredTransactions, displayCurrency, exchangeRate, accountList); // weekly
	}, [filteredTransactions, displayCurrency, exchangeRate, accountList, weeklyGraphChartType]);

	const activeWeeklyCategories = useMemo(() => {
		if (weeklyGraphChartType !== 'weekly' || !data || data.length === 0) {
			return [];
		}

		const categoryTotals = data.reduce((totals, dayData) => {
			expenseCategories.forEach(category => {
				if (dayData[category] > 0) {
					totals[category] = (totals[category] || 0) + dayData[category];
				}
			});
			return totals;
		}, {});

		return Object.keys(categoryTotals);
	}, [weeklyGraphChartType, data]);

	const yAxisTickFormatter = (value) => {
		if (value >= 1000000) {
			return `${value / 1000000}M`;
		}
		if (value >= 1000) {
			return `${value / 1000}K`;
		}
		return value;
	};

	return (
		<Box p={1}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ ml: 1 }}>
				<Typography variant="button">Weekly Graph</Typography>
				<SortMenuButton
					value={weeklyGraphChartType}
					onChange={handleChartTypeChange}
					options={[
						{ value: 'weekly', label: 'Weekly' },
						{ value: 'category', label: 'Category' }
					]}
				/>
			</Stack>
			<ResponsiveContainer width="99%" height={200}>
				{weeklyGraphChartType === 'weekly' ? (
					<BarChart data={data} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
						<XAxis
							dataKey="dayofWeek"
							tickLine={false}
							axisLine={false}
							tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
						/>
						<YAxis
							domain={[0, 'dataMax']}
							axisLine={false}
							tickLine={false}
							tickFormatter={yAxisTickFormatter}
							tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
							width={40}
						/>
						<Tooltip content={<CustomTooltip chartType={weeklyGraphChartType} />} />
						{activeWeeklyCategories.map(i => <Bar key={i} dataKey={i} stackId="a" fill={getCategoryColor(i)} radius={[4, 4, 4, 4]} isAnimationActive={false} />)}
					</BarChart>
				) : (
					<BarChart layout="vertical" data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.palette.divider} />
						<XAxis
							type="number"
							hide
							axisLine={false}
							tickLine={false}
						/>
						<YAxis
							dataKey="category"
							type="category"
							axisLine={false}
							tickLine={false}
							tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
							width={80}
						/>
						<Tooltip content={<CustomTooltip chartType={weeklyGraphChartType} />} />
						<Bar dataKey="amount" radius={[0, 4, 4, 0]} isAnimationActive={false}>
							{data.map((entry, index) => (
								<Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
							))}
						</Bar>
					</BarChart>
				)}
			</ResponsiveContainer>
		</Box>
	);
}

export default WeeklyGraph;
