import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

import moment from 'moment';
import _ from 'lodash';

import ReportGrid from '../components/ReportGrid';

const month = Array.from({ length: 12 }, (v, k) => _.padStart(k + 1, 2, '0'));
const startYear = 2005;
const endYear = parseInt(moment().format('YYYY'), 10);
const yearOptions = Array.from({ length: endYear - startYear + 1 }, (v, k) => k + startYear).map(i => ({ key: i, value: i, text: i }));

const styles = theme => ({
	header: {
		paddingTop: theme.spacing(1),
		[theme.breakpoints.down('sm')]: {
			paddingTop: 0
		}
	}
});

class MonthlyExpense extends Component {
	state = {
		year: parseInt(moment().format('YYYY'), 10),
		livingExpenseOnly: false,
		livingExpenseCardOnly: false
	};

	onYearChange = event => {
		this.setState({
			year: event.target.value
		});
	}

	onLivingExpenseOnlyChange = event => {
		this.setState({
			livingExpenseOnly: event.target.checked
		});
	}

	onLivingExpenseCardOnlyChange = event => {
		this.setState({
			livingExpenseCardOnly: event.target.checked
		});
	}

	getMonthFiltered (data, key, month) {
		const filtered = data[key].filter(i => i.date.substr(5, 2) === month);

		if (filtered.length > 0) {
			return filtered.map(i => i.amount).reduce((a, b) => a + b);
		}

		return 0;
	}

	render () {
		const { allAccountsTransactions, classes } = this.props;
		const { year, livingExpenseOnly, livingExpenseCardOnly } = this.state;
		let incomeTransactions = [];
		let expenseTransactions = [];
		const startDate = moment(`${year}-01-01`).format('YYYY-MM-DD');
		const endDate = moment(`${year}-12-31`).format('YYYY-MM-DD');
		let expenseReport = [];
		let incomeReport = [];
		let totalMonthExpenseSum = [];
		let totalExpenseSum = 0;
		let totalMonthIncomeSum = [];
		let totalIncomeSum = 0;

		allAccountsTransactions.forEach(i => {
			if (i.type === 'CCard' || i.type === 'Bank' || i.type === 'Cash') {
				if (livingExpenseCardOnly && i.account !== '생활비카드') {
					return;
				}
				if (i.amount > 0 && !i.category.startsWith('[') && !i.division) {
					incomeTransactions.push(i);
				}
				if (i.amount < 0 && !i.category.startsWith('[') && !i.division) {
					expenseTransactions.push(i);
				}
				if (i.division) {
					for (let j = 0; j < i.division.length; j++) {
						const transaction = i.division[j];
						if (transaction.amount > 0 && !transaction.category.startsWith('[')) {
							incomeTransactions.push({
								date: i.date,
								category: transaction.category,
								subcategory: transaction.subcategory,
								payee: transaction.description,
								amount: transaction.amount
							});
						} else if (transaction.amount < 0 && !transaction.category.startsWith('[') && transaction.payee !== 'Principal') {
							expenseTransactions.push({
								date: i.date,
								category: transaction.category,
								subcategory: transaction.subcategory,
								payee: transaction.description,
								amount: transaction.amount
							});
						}
					}
				}
			}
		});

		if (livingExpenseCardOnly) {
			incomeTransactions = incomeTransactions.filter(i => i.account === '생활비카드');
			expenseTransactions = expenseTransactions.filter(i => i.account === '생활비카드');
		}

		if (incomeTransactions.length > 0) {
			const groupedIncomeData = _
				.chain(incomeTransactions.filter(k => k.date >= startDate &&  k.date <= endDate))
				.groupBy(x => x.subcategory ? `${x.category}:${x.subcategory}` : x.category)
				.value();

			incomeReport = Object.keys(groupedIncomeData).map(key => {
				return {
					category: key,
					month: month.map(i => this.getMonthFiltered(groupedIncomeData, key, i)),
					sum: groupedIncomeData[key].map(i => i.amount).reduce((a, b) => a + b)
				};
			}).sort((a, b) => {
				const categoryA = a.category.toLowerCase();
				const categoryB = b.category.toLowerCase();
				if (categoryA < categoryB) {
					return -1;
				}
				if (categoryB < categoryA) {
					return 1;
				}
				return 0;
			});

			totalMonthIncomeSum = incomeReport.length > 0 && month.map((m, index) => incomeReport.map(i => i.month[index]).reduce((a, b) => a + b));
			totalIncomeSum = incomeReport.length > 0 && incomeReport.map(i => i.sum).reduce((a, b) => a + b);
		}

		if (expenseTransactions.length > 0) {
			const groupedExpenseData = _
				.chain(expenseTransactions.filter(k => k.date >= startDate &&  k.date <= endDate))
				.groupBy(x => x.subcategory ? `${x.category}:${x.subcategory}` : x.category)
				.value();

			expenseReport = Object.keys(groupedExpenseData).map(key => {
				return {
					category: key,
					month: month.map(i => this.getMonthFiltered(groupedExpenseData, key, i)),
					sum: groupedExpenseData[key].map(i => i.amount).reduce((a, b) => a + b)
				};
			}).sort((a, b) => {
				const categoryA = a.category.toLowerCase();
				const categoryB = b.category.toLowerCase();
				if (categoryA < categoryB) {
					return -1;
				}
				if (categoryB < categoryA) {
					return 1;
				}
				return 0;
			});

			if (livingExpenseOnly) {
				const exemptionCategory = [
					'세금',
					'대출이자',
					'보험',
					'실제지출아님',
					'취미-레저:여행',
					'교통비:차량구입비'
				];
				expenseReport = expenseReport.filter(i => !exemptionCategory.find(j => i.category && i.category.startsWith(j)));
			}
			totalMonthExpenseSum = expenseReport.length > 0 && month.map((m, index) => expenseReport.map(i => i.month[index]).reduce((a, b) => a + b));
			totalExpenseSum = expenseReport.length > 0 && expenseReport.map(i => i.sum).reduce((a, b) => a + b);
		}
		let reportData = [];

		reportData = [
			[
				'Category',
				...month,
				'Total'
			]
		];

		if (incomeReport.length > 0 ) {
			reportData = [
				...reportData,
				...incomeReport.map(i => {
					return [
						i.category,
						...i.month,
						i.sum
					];
				}),
				[
					'Income Total',
					...totalMonthIncomeSum,
					totalIncomeSum
				]
			];
		}
		if (expenseReport.length > 0 ) {
			reportData = [
				...reportData,
				...expenseReport.map(i => {
					return [
						i.category,
						...i.month,
						i.sum
					];
				}),
				[
					'Expense Total',
					...totalMonthExpenseSum,
					totalExpenseSum
				]
			];
		}

		return (
			<div>
				<div className={classes.header}>
					<FormControl fullWidth>
						<Select
							value={year}
							onChange={this.onYearChange}
							inputProps={{
								name: 'year',
								id: 'year-select'
							}}
						>
							{
								yearOptions.map(i => (
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
									onChange={this.onLivingExpenseOnlyChange}
								/>
							}
							label="생활비만 보기"
						/>
						<FormControlLabel
							control={
								<Switch
									checked={livingExpenseCardOnly}
									onChange={this.onLivingExpenseCardOnlyChange}
								/>
							}
							label="생활비카드만 보기"
						/>
					</div>
				</div>
				{reportData.length > 0 && <ReportGrid reportData={reportData} />}
			</div>
		);
	}
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
