import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import Checkbox from '@mui/material/Checkbox';

import moment from 'moment';
import FilterListIcon from '@mui/icons-material/FilterList';

import ReportGrid from '../../components/ReportGrid';
import MonthlyComparisonChart from './MonthlyComparisonChart';

import useMonthlyExpense from './useMonthlyExpense';
import useTransactions from './useTransactions';
import useIncomeReport from './useIncomeReport';
import useExpenseReport from './useExpenseReport';

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
	const usd = useSelector((state) => state.settings.general.currency === 'USD');

	const { incomeTransactions, expenseTransactions } = useTransactions(allAccountsTransactions, livingExpenseCardOnly, boAOnly);
	const { incomeReport, totalMonthIncomeSum, totalIncomeSum } = useIncomeReport(accountList, incomeTransactions, year, usd, exchangeRate);
	const { expenseReport, totalMonthExpenseSum, totalExpenseSum } = useExpenseReport(accountList, expenseTransactions, year, livingExpenseOnly, usd, exchangeRate);
	const reportData = useMonthlyExpense(incomeReport, expenseReport, totalMonthIncomeSum, totalIncomeSum, totalMonthExpenseSum, totalExpenseSum, year);

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
		<Stack spacing={2}>
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
					<Button
						id="filter-button"
						aria-controls={open ? 'filter-menu' : undefined}
						aria-haspopup="true"
						aria-expanded={open ? 'true' : undefined}
						onClick={handleFilterClick}
						startIcon={<FilterListIcon />}
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
				</div>
			</Stack>
			<MonthlyComparisonChart chartData={chartData} />
			{reportData.length > 0 && <ReportGrid reportData={reportData} supportSearch/>}
		</Stack>
	);
};

export default MonthlyExpense;
