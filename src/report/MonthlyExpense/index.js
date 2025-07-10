import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import Checkbox from '@mui/material/Checkbox';

import moment from 'moment';
import FilterListIcon from '@mui/icons-material/FilterList';

import ReportGrid from '../../components/ReportGrid';
import SortMenuButton from '../../components/SortMenuButton';
import MonthlyComparisonChart from './MonthlyComparisonChart';
import Button from '@mui/material/Button';

import useMonthlyExpense from './useMonthlyExpense';
import useTransactions from './useTransactions';
import useIncomeReport from './useIncomeReport';
import useExpenseReport from './useExpenseReport';
import useSankeyData from './useSankeyData';
import SankeyChart from './SankeyChart';

import { YEAR_LIST, MONTH_LIST } from '../../constants';

const MonthlyExpense = () => {
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { exchangeRate } = useSelector((state) => state.settings.general);
	const [year, setYear] = useState(parseInt(moment().format('YYYY'), 10));
	const [livingExpenseOnly, setLivingExpenseOnly] = useState(false);
	const [livingExpenseCardOnly, setLivingExpenseCardOnly] = useState(false);
	const [boAOnly, setBoAOnly] = useState(false);
	const [anchorEl, setAnchorEl] = useState(null);
	const [view, setView] = useState('grid');
	const usd = useSelector((state) => state.settings.general.currency === 'USD');

	const { incomeTransactions, expenseTransactions } = useTransactions(allAccountsTransactions, livingExpenseCardOnly, boAOnly);
	const { incomeReport, totalMonthIncomeSum, totalIncomeSum } = useIncomeReport(accountList, incomeTransactions, year, usd, exchangeRate);
	const { expenseReport, totalMonthExpenseSum, totalExpenseSum } = useExpenseReport(accountList, expenseTransactions, year, livingExpenseOnly, usd, exchangeRate);
	const reportData = useMonthlyExpense(incomeReport, expenseReport, totalMonthIncomeSum, totalIncomeSum, totalMonthExpenseSum, totalExpenseSum, year);
	const { sankeyData } = useSankeyData(incomeReport, expenseReport, totalIncomeSum, totalExpenseSum);

	const chartData = MONTH_LIST.map((_, index) => ({
		month: moment().month(index).format('MMM'),
		income: totalMonthIncomeSum[index] || 0,
		expense: Math.abs(totalMonthExpenseSum[index] || 0)
	}));

	const open = Boolean(anchorEl);

	const handleFilterClick = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleFilterClose = () => {
		setAnchorEl(null);
	};

	const onYearChange = event => {
		setYear(event.target.value);
	};

	const onLivingExpenseOnlyChange = () => {
		setLivingExpenseOnly(prev => !prev);
	};

	const onLivingExpenseCardOnlyChange = () => {
		setLivingExpenseCardOnly(prev => !prev);
	};

	const onBoAOnlyChange = () => {
		setBoAOnly(prev => !prev);
	};

	return (
		<Box
			sx={{
				height: 'calc(100vh - 192px)',
				display: 'flex',
				flexDirection: 'column'
			}}
		>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<FormControl variant="standard" sx={{ minWidth: 120 }}>
					<Select
						value={year}
						onChange={onYearChange}
					>
						{
							YEAR_LIST.map(i => (
								<MenuItem key={i.key} value={i.value}>{i.text}</MenuItem>
							))
						}
					</Select>
				</FormControl>
				<div>
					<Stack direction="row" spacing={1} alignItems="center">
						<SortMenuButton
							value={view}
							onChange={setView}
							options={[
								{ value: 'grid', label: 'Grid' },
								{ value: 'sankey', label: 'Sankey' }
							]}
						/>
						<Button
							id="filter-button"
							aria-controls={open ? 'filter-menu' : undefined}
							aria-haspopup="true"
							aria-expanded={open ? 'true' : undefined}
							onClick={handleFilterClick}
							size="small"
							startIcon={<FilterListIcon />}
							sx={{ textTransform: 'none' }}
						>
							Filters
						</Button>
						<Menu
							id="filter-menu"
							anchorEl={anchorEl}
							open={open}
							onClose={handleFilterClose}
						>
							<MenuItem onClick={onLivingExpenseOnlyChange}>
								<Checkbox checked={livingExpenseOnly} />
								생활비만 보기
							</MenuItem>
							<MenuItem onClick={onLivingExpenseCardOnlyChange}>
								<Checkbox checked={livingExpenseCardOnly} />
								생활비카드만 보기
							</MenuItem>
							<MenuItem onClick={onBoAOnlyChange}>
								<Checkbox checked={boAOnly} />
								BoA Only
							</MenuItem>
						</Menu>
					</Stack>
				</div>
			</Stack>
			<MonthlyComparisonChart chartData={chartData} />
			<Box sx={{ flex: 1, mt: 1 }}>
				{view === 'grid' && reportData.length > 1 && <ReportGrid reportData={reportData} supportSearch/>}
				{view === 'sankey' && <SankeyChart data={sankeyData} />}
			</Box>
		</Box>
	);
};

export default MonthlyExpense;
