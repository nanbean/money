import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

import moment from 'moment';

import ReportGrid from '../../components/ReportGrid';

import useMonthlyExpense from './useMonthlyExpense';
import useTransactions from './useTransactions';
import useIncomeReport from './useIncomeReport';
import useExpenseReport from './useExpenseReport';

import { YEAR_LIST } from '../../constants';

const styles = theme => ({
	header: {
		paddingTop: theme.spacing(1),
		[theme.breakpoints.down('sm')]: {
			paddingTop: 0
		}
	}
});

const MonthlyExpense = ({allAccountsTransactions, classes}) => {
	const [year, setYear] = useState(parseInt(moment().format('YYYY'), 10));
	const [livingExpenseOnly, setLivingExpenseOnly] = useState(false);
	const [livingExpenseCardOnly, setLivingExpenseCardOnly] = useState(false);
	const [boAOnly, setBoAOnly] = useState(false);

	const {incomeTransactions, expenseTransactions} = useTransactions(allAccountsTransactions, livingExpenseCardOnly, boAOnly);
	const {incomeReport, totalMonthIncomeSum, totalIncomeSum} = useIncomeReport(incomeTransactions, year);
	const {expenseReport, totalMonthExpenseSum, totalExpenseSum} = useExpenseReport(expenseTransactions, year, livingExpenseOnly);
	const reportData = useMonthlyExpense(incomeReport, expenseReport, totalMonthIncomeSum, totalIncomeSum, totalMonthExpenseSum, totalExpenseSum);

	const onYearChange = event => {
		setYear(event.target.value);
	}

	const onLivingExpenseOnlyChange = event => {
		setLivingExpenseOnly(event.target.checked);
	}

	const onLivingExpenseCardOnlyChange = event => {
		setLivingExpenseCardOnly(event.target.checked)
	}

	const onBoAOnlyChange = event => {
		setBoAOnly(event.target.checked);
	}

	return (
		<div>
			<div className={classes.header}>
				<FormControl fullWidth>
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
			{reportData.length > 0 && <ReportGrid reportData={reportData} />}
		</div>
	);
}

MonthlyExpense.propTypes = {
	allAccountsTransactions:  PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
	allAccountsTransactions: state.allAccountsTransactions
});

export default connect(
	mapStateToProps,
	null
)(withStyles(styles)(MonthlyExpense));
