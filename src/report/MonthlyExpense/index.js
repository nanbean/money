import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

import moment from 'moment';

import ReportGrid from '../../components/ReportGrid';

import useMonthlyExpense from './useMonthlyExpense';
import useTransactions from './useTransactions';
import useIncomeReport from './useIncomeReport';
import useExpenseReport from './useExpenseReport';

import { YEAR_LIST } from '../../constants';

const MonthlyExpense = () => {
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { exchangeRate } = useSelector((state) => state.settings.general);
	const [year, setYear] = useState(parseInt(moment().format('YYYY'), 10));
	const [livingExpenseOnly, setLivingExpenseOnly] = useState(false);
	const [livingExpenseCardOnly, setLivingExpenseCardOnly] = useState(false);
	const [boAOnly, setBoAOnly] = useState(false);
	const usd = useSelector((state) => state.settings.general.currency === 'USD');

	const { incomeTransactions, expenseTransactions } = useTransactions(allAccountsTransactions, livingExpenseCardOnly, boAOnly);
	const { incomeReport, totalMonthIncomeSum, totalIncomeSum } = useIncomeReport(accountList, incomeTransactions, year, usd, exchangeRate);
	const { expenseReport, totalMonthExpenseSum, totalExpenseSum } = useExpenseReport(accountList, expenseTransactions, year, livingExpenseOnly, usd, exchangeRate);
	const reportData = useMonthlyExpense(incomeReport, expenseReport, totalMonthIncomeSum, totalIncomeSum, totalMonthExpenseSum, totalExpenseSum, year);

	const onYearChange = event => {
		setYear(event.target.value);
	};

	const onLivingExpenseOnlyChange = event => {
		setLivingExpenseOnly(event.target.checked);
	};

	const onLivingExpenseCardOnlyChange = event => {
		setLivingExpenseCardOnly(event.target.checked);
	};

	const onBoAOnlyChange = event => {
		setBoAOnly(event.target.checked);
	};

	return (
		<div>
			<div>
				<FormControl fullWidth variant="standard">
					<Select
						value={year}
						onChange={onYearChange}
						inputProps={{
							name: 'year',
							id: 'year-select'
						}}
					>
						{
							YEAR_LIST.map(i => (
								<MenuItem key={i.key} value={i.value}>{i.text}</MenuItem>
							))
						}
					</Select>
				</FormControl>
				<div>
					<FormControlLabel
						control={
							<Switch
								checked={livingExpenseOnly}
								onChange={onLivingExpenseOnlyChange}
							/>
						}
						label="생활비만 보기"
					/>
					<FormControlLabel
						control={
							<Switch
								checked={livingExpenseCardOnly}
								onChange={onLivingExpenseCardOnlyChange}
							/>
						}
						label="생활비카드만 보기"
					/>
					<FormControlLabel
						control={
							<Switch
								checked={boAOnly}
								onChange={onBoAOnlyChange}
							/>
						}
						label="BoA Only"
					/>
				</div>
			</div>
			{reportData.length > 0 && <ReportGrid reportData={reportData} supportSearch/>}
		</div>
	);
};

export default MonthlyExpense;
