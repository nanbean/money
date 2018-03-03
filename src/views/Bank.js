import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Button, Divider } from 'semantic-ui-react';

import MortgageSchedule from '../components/MortgageSchedule';
import TitleHeader from '../components/TitleHeader';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';
import BankTransactionForm from '../components/BankTransactionForm';

import { getMortgageScheduleAction } from '../actions/mortgageActions';
import { getCategoryListAction } from '../actions/categoryActions';
import { getPayeeListAction } from '../actions/payeeActions';
import {
	getTransactionsAction,
	addTransactionAction,
	deleteTransactionAction,
	editTransactionAction
} from '../actions/transactionActions';
import {
	openTransactionInModal,
	resetTransactionForm,
} from '../actions/ui/form/bankTransaction';
import { toCurrencyFormat } from '../utils/formatting';

class Bank extends Component {
	componentWillMount () {
		const { match } = this.props;
		const name = match && match.params && match.params.name;

		this.props.getTransactionsAction(name);
		this.props.getCategoryListAction();
		this.props.getPayeeListAction();
	}

	render () {
		const { account, transactions, categoryList, payeeList, mortgageSchedule } = this.props;
		const balance = transactions.length > 0 && transactions.map((i) => i.amount).reduce( (a, b) => a + b );
		const dropCategoryList = categoryList.map(i => { return {key: i, value: i, text: i}});
		const dropPayeeList = payeeList.map(i => { return {key: i, name: i}});

		return (
			<div>
				<TitleHeader title={account} />
				<div className='container-full-page'>
					<div className='container-header'>
						<Button.Group basic fluid>
							<Button
								icon="plus"
								labelPosition="right"
								content="New"
								onClick={this.props.openTransactionInModal}
							/>
						</Button.Group>
					</div>
					<BankTransactions
						account={account}
						transactions={transactions}
						openTransactionInModal={this.props.openTransactionInModal}
					/>
					<Divider horizontal>잔액 : {toCurrencyFormat(balance)}</Divider>
					<BankTransactionModal
						EditForm={BankTransactionForm}
						isOpen={this.props.isModalOpen}
						isEdit={this.props.isEdit}
						account={account}
						transactions={transactions}
						dropCategoryList={dropCategoryList}
						dropPayeeList={dropPayeeList}
						resetTransactionForm={this.props.resetTransactionForm}
						addTransactionAction={this.props.addTransactionAction}
						deleteTransactionAction={this.props.deleteTransactionAction}
						editTransactionAction={this.props.editTransactionAction}
					/>
					{
						account === '아낌이모기지론' &&
						<MortgageSchedule
							mortgageSchedule={mortgageSchedule}
							getMortgageScheduleAction={this.props.getMortgageScheduleAction}
							addTransactionAction={this.props.addTransactionAction}
						/>
					}
				</div>
			</div>
		);
	}
}

Bank.propTypes = {
	account: PropTypes.string.isRequired,
	categoryList: PropTypes.array.isRequired,
	payeeList: PropTypes.array.isRequired,
	transactions: PropTypes.array.isRequired,
	mortgageSchedule: PropTypes.array.isRequired,
	getTransactionsAction: PropTypes.func.isRequired,
	addTransactionAction: PropTypes.func.isRequired,
	getCategoryListAction: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
	account: state.account,
	categoryList: state.categoryList,
	payeeList: state.payeeList,
	transactions: state.transactions,
	mortgageSchedule: state.mortgageSchedule,
	isModalOpen: state.ui.form.bankTransaction.isModalOpen,
	isEdit: state.ui.form.bankTransaction.isEdit
});

const mapDispatchToProps = dispatch => ({
	getCategoryListAction () {
		dispatch(getCategoryListAction());
	},
	getPayeeListAction () {
		dispatch(getPayeeListAction());
	},
	getTransactionsAction (params) {
		dispatch(getTransactionsAction(params));
	},
	addTransactionAction (params) {
		dispatch(addTransactionAction(params));
	},
	deleteTransactionAction (params) {
		dispatch(deleteTransactionAction(params));
	},
	editTransactionAction (params) {
		dispatch(editTransactionAction(params));
	},
	openTransactionInModal (params) {
		dispatch(openTransactionInModal(params));
	},
	resetTransactionForm () {
		dispatch(resetTransactionForm());
	},
	getMortgageScheduleAction () {
		dispatch(getMortgageScheduleAction());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Bank);
