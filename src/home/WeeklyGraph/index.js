import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import SortIcon from '@mui/icons-material/Sort';

import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	Cell
} from 'recharts';

import { updateGeneralAction } from '../../actions/couchdbSettingActions';

import { getCategoryColor } from '../../utils/categoryColor';

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

export function WeeklyGraph () {
	const weeklyTransactions = useSelector((state) => state.weeklyTransactions);
	const weeklyGraphAccountSettings = useSelector((state) => state.settings.weeklyGraphAccount);
	const { currency: displayCurrency, exchangeRate } = useSelector((state) => state.settings.general);
	const accountList = useSelector((state) => state.accountList);
	const { weeklyGraphChartType = 'weekly' } = useSelector((state) => state.settings.general);
	const [anchorEl, setAnchorEl] = useState(null);
	const open = Boolean(anchorEl);
	const dispatch = useDispatch();

	const handleChartTypeClick = (event) => setAnchorEl(event.currentTarget);
	const handleChartTypeClose = () => setAnchorEl(null);
	const handleChartTypeMenuItemClick = (newChartType) => {
		if (newChartType) {
			dispatch(updateGeneralAction('weeklyGraphChartType', newChartType));
		}
		handleChartTypeClose();
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

	return (
		<Box p={1}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, p: 1 }}>
				<Typography variant="subtitle1">Weekly Graph</Typography>
				<div>
					<Button
						id="sort-button"
						aria-controls={open ? 'sort-menu' : undefined}
						aria-haspopup="true"
						aria-expanded={open ? 'true' : undefined}
						onClick={handleChartTypeClick}
						size="small"
						startIcon={<SortIcon />}
						sx={{ textTransform: 'none' }}
					>
						{weeklyGraphChartType.charAt(0).toUpperCase() + weeklyGraphChartType.slice(1)}
					</Button>
					<Menu
						id="sort-menu"
						anchorEl={anchorEl}
						open={open}
						onClose={handleChartTypeClose}
						MenuListProps={{ 'aria-labelledby': 'sort-button' }}>
						<MenuItem onClick={() => handleChartTypeMenuItemClick('weekly')} selected={'weekly' === weeklyGraphChartType}>Weekly</MenuItem>
						<MenuItem onClick={() => handleChartTypeMenuItemClick('category')} selected={'category' === weeklyGraphChartType}>Category</MenuItem>
					</Menu>
				</div>
			</Stack>
			<ResponsiveContainer width="99%" height={200}>
				{weeklyGraphChartType === 'weekly' ? (
					<BarChart data={data} margin={{ top: 0, right: 5, left: 20, bottom: 0 }}>
						<XAxis dataKey="dayofWeek" tickLine={false} />
						<YAxis domain={[0, 'dataMax']} axisLine={false} tickLine={false} />
						<Tooltip />
						{activeWeeklyCategories.map(i => <Bar key={i} dataKey={i} stackId="a" fill={getCategoryColor(i)} />)}
					</BarChart>
				) : (
					<BarChart data={data} margin={{ top: 0, right: 5, left: 20, bottom: 0 }}>
						<XAxis dataKey="category" tickLine={false} />
						<YAxis domain={[0, 'dataMax']} axisLine={false} tickLine={false} />
						<Tooltip />
						<Bar dataKey="amount">
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
