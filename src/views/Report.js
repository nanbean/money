import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Dropdown, Checkbox } from 'semantic-ui-react';
import moment from 'moment';
import _ from 'lodash';

import TitleHeader from '../components/TitleHeader';
import ReportGrid from '../components/ReportGrid';

import { getAllAccountTransactionsAction } from '../actions/transactionActions';

const month = Array.from({length: 12}, (v, k) => _.padStart(k + 1, 2, '0'));
const startYear = 2005;
const endYear = parseInt(moment().format('YYYY'), 10);
const yearOptions = Array.from({length: endYear - startYear + 1}, (v, k) => k + startYear).map(i => ({key: i, value: i, text: i}));

class Report extends Component {
	constructor (props) {
		super(props);

		this.onYearChange = this.onYearChange.bind(this);
		this.onLivingExpenseOnlyChange = this.onLivingExpenseOnlyChange.bind(this);
		this.onLivingExpenseCardOnlyChange = this.onLivingExpenseCardOnlyChange.bind(this);

		this.state = {
			year: parseInt(moment().format('YYYY'), 10),
			livingExpenseOnly: false,
			livingExpenseCardOnly: false
		};
	}

	onYearChange (e, data) {
		this.setState({
			year: data.value
		});
	}

	onLivingExpenseOnlyChange (e, data) {
		this.setState({
			livingExpenseOnly: data.checked
		});
	}

	onLivingExpenseCardOnlyChange (e, data) {
		this.setState({
			livingExpenseCardOnly: data.checked
		});
	}

	componentWillMount () {
		this.props.getAllAccountTransactionsAction();
	}

	getMonthFiltered (data, key, month) {
		const filtered = data[key].filter(i => i.date.substr(5, 2) === month);

		if (filtered.length > 0) {
			return filtered.map(i => i.amount).reduce((a, b) => a + b);
		}

		return 0;
	}

	render () {
		const { allAccountTransactions } = this.props;
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

		for (let i in allAccountTransactions) {
			const account = allAccountTransactions[i];
			if (account.type === 'CCard' || account.type === 'Bank' || account.type === 'Cash') {
				const divisionTransaction = account.transactions.filter(k => k.division);
				let divisions = [];
				for (let l = 0; l < divisionTransaction.length; l++) {
					const division = divisionTransaction[l].division;
					const date = divisionTransaction[l].date;
					for (let m = 0; m < division.length; m++) {
						const divisionItem = division[m];
						divisionItem.date = date;
						divisionItem.payee = divisionItem.description;
						divisions.push(divisionItem);
					}
				}
				if (livingExpenseCardOnly && i !== '생활비카드') {
					continue;
				}
				incomeTransactions = [
					...incomeTransactions,
					...account.transactions.filter(j => j.amount > 0 && !j.category.startsWith('[') && !j.division),
					...divisions.filter(j => j.amount > 0 && !j.category.startsWith('['))
				];
				expenseTransactions = [
					...expenseTransactions,
					...account.transactions.filter(j => j.amount < 0 && !j.category.startsWith('[') && !j.division),
					...divisions.filter(j => j.amount < 0 && !j.category.startsWith('[') && j.payee !== 'Principal')
				];
			}
		}

		if (incomeTransactions.length > 0  && expenseTransactions.length > 0) {
			const groupedExpenseData = _
				.chain(expenseTransactions.filter(k => k.date >= startDate &&  k.date <= endDate))
				.groupBy(x => x.subcategory ? `${x.category}:${x.subcategory}` : x.category)
				.value();
			const groupedIncomeData = _
				.chain(incomeTransactions.filter(k => k.date >= startDate &&  k.date <= endDate))
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

			if (livingExpenseOnly) {
				const exemptionCategory = [
					'세금',
					'대출이자',
					'보험',
					'실제지출아님',
					'취미-레저:여행',
					'교통비:차량구입비'
				];
				expenseReport = expenseReport.filter(i => !exemptionCategory.find(j => i.category.startWith(j)));
			}
			totalMonthExpenseSum = month.map((m, index) => expenseReport.map(i => i.month[index]).reduce((a, b) => a + b));
			totalExpenseSum = expenseReport.map(i => i.sum).reduce((a, b) => a + b);
			totalMonthIncomeSum = month.map((m, index) => incomeReport.map(i => i.month[index]).reduce((a, b) => a + b));
			totalIncomeSum = incomeReport.map(i => i.sum).reduce((a, b) => a + b);
		}
		let reportData = [];

		if (incomeReport.length > 0 ) {
			reportData = [
				[
					'Category',
					...month,
					'Total'
				],
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
				],
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
				<TitleHeader title='Monthly Expense' />
				<div className='container-full-page'>
					<div className="container-header">
						<Dropdown
							fluid
							placeholder='Year'
							value={year}
							search
							selection
							options={yearOptions}
							onChange={this.onYearChange}
						/>
						<div className='detail-toggle'>
							<Checkbox toggle label='생활비만 보기' checked={livingExpenseOnly} onChange={this.onLivingExpenseOnlyChange} />
							<Checkbox toggle label='생활비카드만 보기' checked={livingExpenseCardOnly} onChange={this.onLivingExpenseCardOnlyChange} />
						</div>
					</div>
					{reportData.length > 0 && <ReportGrid reportData={reportData} />}
				</div>
			</div>
		);
	}
}

Report.propTypes = {
	allAccountTransactions:  PropTypes.object.isRequired,
	getAllAccountTransactionsAction: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
	allAccountTransactions: state.allAccountTransactions
});

const mapDispatchToProps = dispatch => ({
	getAllAccountTransactionsAction () {
		dispatch(getAllAccountTransactionsAction());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Report);
