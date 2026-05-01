import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import moment from 'moment';

import FilterMenu from '../../components/FilterMenu';
import ReportGrid from '../../components/ReportGrid';
import SortMenuButton from '../../components/SortMenuButton';
import MonthlyComparisonChart from './MonthlyComparisonChart';

import useMonthlyExpense from './useMonthlyExpense';
import useTransactions from './useTransactions';
import useIncomeReport from './useIncomeReport';
import useExpenseReport from './useExpenseReport';
import useSankeyData from './useSankeyData';
import SankeyChart from './SankeyChart';

import useT from '../../hooks/useT';
import { sDisplay, labelStyle } from '../../utils/designTokens';

import { YEAR_LIST, MONTH_LIST } from '../../constants';

const MonthlyExpense = () => {
	const T = useT();
	const lab = labelStyle(T);

	const location = useLocation();
	const navigate = useNavigate();
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { exchangeRate, currency, livingExpenseExempt = [] } = useSelector((state) => state.settings);

	const [year, setYear] = useState(() => {
		const params = new URLSearchParams(location.search);
		const y = parseInt(params.get('year'), 10);
		return y || parseInt(moment().format('YYYY'), 10);
	});
	const [filters, setFilters] = useState(() => {
		const params = new URLSearchParams(location.search);
		const filtersParam = params.get('filters');
		return filtersParam ? filtersParam.split(',') : [];
	});
	const [view, setView] = useState('grid');

	const reportView = filters.includes('category') ? 'category' : 'subcategory';
	const usd = currency === 'USD';

	const livingExpenseOnly = filters.includes('livingExpenseOnly');
	const livingExpenseCardOnly = filters.includes('livingExpenseCardOnly');
	const boAOnly = filters.includes('boAOnly');

	const { incomeTransactions, expenseTransactions } = useTransactions(allAccountsTransactions, livingExpenseCardOnly, boAOnly);
	const { incomeReport, totalMonthIncomeSum, totalIncomeSum } = useIncomeReport(accountList, incomeTransactions, year, usd, exchangeRate, reportView);
	const { expenseReport, totalMonthExpenseSum, totalExpenseSum } = useExpenseReport(accountList, expenseTransactions, year, livingExpenseOnly, usd, exchangeRate, reportView, livingExpenseExempt);
	const reportData = useMonthlyExpense(incomeReport, expenseReport, totalMonthIncomeSum, totalIncomeSum, totalMonthExpenseSum, totalExpenseSum, year);
	const { sankeyData } = useSankeyData(incomeReport, expenseReport, totalIncomeSum, totalExpenseSum);

	const chartData = MONTH_LIST.map((_, index) => ({
		month: moment().month(index).format('MMM'),
		income: totalMonthIncomeSum[index] || 0,
		expense: Math.abs(totalMonthExpenseSum[index] || 0)
	}));

	const onYearChange = event => {
		const val = event.target.value;
		setYear(val);
		const params = new URLSearchParams(location.search);
		params.set('year', val);
		navigate(`?${params.toString()}`, { replace: true });
	};

	const onFilterChange = (newFilters) => {
		setFilters(newFilters);
		const params = new URLSearchParams(location.search);
		if (newFilters.length > 0) {
			params.set('filters', newFilters.join(','));
		} else {
			params.delete('filters');
		}
		navigate(`?${params.toString()}`, { replace: true });
	};

	const filterOptions = [
		{ value: 'category', label: '카테고리별 보기' },
		{ value: 'livingExpenseOnly', label: '생활비만 보기' },
		{ value: 'livingExpenseCardOnly', label: '생활비카드만 보기' },
		{ value: 'boAOnly', label: 'BoA Only' }
	];

	const panelSx = {
		background: T.surf,
		border: `1px solid ${T.rule}`,
		borderRadius: '16px',
		padding: { xs: '14px', md: '18px' },
		color: T.ink
	};

	const yearSelectSx = {
		minWidth: 140,
		'& .MuiOutlinedInput-root': {
			background: T.bg,
			borderRadius: '8px',
			fontSize: 13,
			color: T.ink,
			height: 36
		},
		'& .MuiOutlinedInput-notchedOutline': { borderColor: T.rule },
		'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.acc.hero },
		'& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.acc.hero }
	};

	return (
		<Stack
			spacing={2}
			sx={{
				flex: 1,
				// Concrete viewport-relative height so the inner flex:1 panel actually receives
				// remaining space. Offset accounts for sidebar header gutter + DesignPage title +
				// section pill row + sub-tab row + page padding.
				height: { xs: 'auto', md: 'calc(100vh - 140px)' },
				minHeight: { xs: 720, md: 'calc(100vh - 140px)' },
				display: 'flex',
				flexDirection: 'column'
			}}
		>
			{/* Top controls + chart panel */}
			<Box sx={panelSx}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1, marginBottom: 1.5 }}>
					<Stack direction="row" alignItems="center" spacing={1.5}>
						<Typography sx={lab}>Year</Typography>
						<FormControl size="small" sx={yearSelectSx}>
							<Select
								value={year}
								onChange={onYearChange}
								MenuProps={{
									PaperProps: { sx: { background: T.surf, color: T.ink, border: `1px solid ${T.rule}` } }
								}}
							>
								{
									YEAR_LIST.map(i => (
										<MenuItem key={i.key} value={i.value}>{i.text}</MenuItem>
									))
								}
							</Select>
						</FormControl>
					</Stack>
					<Stack direction="row" spacing={1} alignItems="center">
						<SortMenuButton
							value={view}
							onChange={setView}
							options={[
								{ value: 'grid', label: 'Grid' },
								{ value: 'sankey', label: 'Sankey' }
							]}
						/>
						<FilterMenu
							filterName="Filters"
							options={filterOptions}
							selectedOptions={filters}
							onSelectionChange={onFilterChange}
						/>
					</Stack>
				</Stack>
				<MonthlyComparisonChart chartData={chartData} />
			</Box>

			{/* Grid / Sankey panel — fills remaining vertical space */}
			<Box sx={{
				...panelSx,
				flex: { xs: '0 0 auto', md: 1 },
				display: 'flex',
				flexDirection: 'column',
				// Mobile takes natural height (Sankey wrapper sets its own px); desktop fills via flex.
				minHeight: { xs: 'auto', md: 0 },
				padding: 0,
				overflow: { xs: 'visible', md: 'hidden' }
			}}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ padding: { xs: '14px 14px 8px', md: '18px 18px 10px' } }}>
					<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 }}>
						{view === 'grid' ? 'Monthly breakdown' : 'Income & expense flow'}
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}>
							{' · '}{view === 'grid' ? '월별 내역' : '수입·지출 흐름'}
						</Box>
					</Typography>
					{view === 'grid' && reportData.length > 1 && (
						<Typography sx={{ fontSize: 11, color: T.ink3 }}>
							{reportData.length - 1} rows
						</Typography>
					)}
				</Stack>
				<Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
					{view === 'grid' && reportData.length > 1 && (
						<ReportGrid reportData={reportData} supportSearch />
					)}
					{view === 'sankey' && (
						<Box sx={{ height: { xs: 600, md: '100%' }, minHeight: { xs: 600, md: 480 } }}>
							<SankeyChart data={sankeyData} />
						</Box>
					)}
					{view === 'grid' && reportData.length <= 1 && (
						<Box sx={{ padding: 4, textAlign: 'center' }}>
							<Typography sx={{ fontSize: 13, color: T.ink2 }}>No spending data yet</Typography>
						</Box>
					)}
				</Box>
			</Box>
		</Stack>
	);
};

export default MonthlyExpense;
