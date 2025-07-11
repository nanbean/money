import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FilterMenu from '../../components/FilterMenu';

import moment from 'moment';

import ReportGrid from '../../components/ReportGrid';
import SortMenuButton from '../../components/SortMenuButton';
import MonthlyComparisonChart from './MonthlyComparisonChart';

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
	const { exchangeRate, currency } = useSelector((state) => state.settings);
	const [year, setYear] = useState(parseInt(moment().format('YYYY'), 10));
	const [filters, setFilters] = useState([]);
	const [view, setView] = useState('grid');
	const usd = currency === 'USD';

	const livingExpenseOnly = filters.includes('livingExpenseOnly');
	const livingExpenseCardOnly = filters.includes('livingExpenseCardOnly');
	const boAOnly = filters.includes('boAOnly');

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

	const onYearChange = event => {
		setYear(event.target.value);
	};

	const filterOptions = [
		{ value: 'livingExpenseOnly', label: '생활비만 보기' },
		{ value: 'livingExpenseCardOnly', label: '생활비카드만 보기' },
		{ value: 'boAOnly', label: 'BoA Only' }
	];

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
						<FilterMenu
							filterName="Filters"
							options={filterOptions}
							selectedOptions={filters}
							onSelectionChange={setFilters}
						/>
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
