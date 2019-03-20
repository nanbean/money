import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Input } from 'semantic-ui-react';

import TitleHeader from '../components/TitleHeader';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';
import BankTransactionForm from '../components/BankTransactionForm';

import { getAllAccountTransactionsAction } from '../actions/transactionActions';
import { getCategoryListAction } from '../actions/categoryActions';
import { getPayeeListAction } from '../actions/payeeActions';
import {
	deleteTransactionAction,
	editTransactionAction
} from '../actions/transactionActions';
import {
	openTransactionInModal,
	resetTransactionForm
} from '../actions/ui/form/bankTransaction';

class Search extends Component {
	constructor (props) {
		super(props);

		this.onSearchKeyPress = this.onSearchKeyPress.bind(this);
		this.onKeywordChange = this.onKeywordChange.bind(this);
		this.updateFilteredTransactions = this.updateFilteredTransactions.bind(this);

		this.state = {
			filteredTransactions: [],
			keyword: ''
		};
	}

	componentDidMount () {
		const { match } = this.props;
		const keyword = match && match.params && match.params.keyword;

		this.setState({
			keyword
		});
		this.props.getAllAccountTransactionsAction();
		this.props.getCategoryListAction();
		this.props.getPayeeListAction();
	}

	updateFilteredTransactions (allAccountTransactions, keyword) {
		if (keyword) {
			let filteredTransactions = [];
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
					filteredTransactions = [
						...filteredTransactions,
						...account.transactions.filter(j => {
							if (j.category.match(new RegExp(keyword, 'i')) || j.payee.match(new RegExp(keyword, 'i'))) {
								return true;
							} else if (j.subcategory && j.subcategory.match(new RegExp(keyword, 'i'))) {
								return true;
							} else if (j.memo && j.memo.match(new RegExp(keyword, 'i'))) {
								return true;
							} else {
								return false;
							}
						}).map(k => {
							k.account = i;
							return k;
						})
					];
				}
			}
			this.setState({
				filteredTransactions,
				keyword
			});
		}
	}

	onSearchKeyPress (e) {
		if (e.key === 'Enter' && e.target.value) {
			const { allAccountTransactions } = this.props;
			const keyword = e.target.value;
			this.updateFilteredTransactions(allAccountTransactions,  keyword);
		}
	}

	onKeywordChange (e) {
		this.setState({
			keyword: e.target.value
		});
	}

	render () {
		const { categoryList, payeeList } = this.props;
		const { filteredTransactions, keyword } = this.state;
		const dropCategoryList = categoryList.map(i => ({ key: i, value: i, text: i }));
		const dropPayeeList = payeeList.map(i => ({ key: i, name: i }));

		return (
			<div>
				<TitleHeader title="Search" />
				<div className="container-full-page">
					<div className="container-header">
						<Input
							fluid
							icon="search"
							placeholder="Search..."
							value={keyword}
							onChange={this.onKeywordChange}
							onKeyPress={this.onSearchKeyPress}
						/>
					</div>
					{
						filteredTransactions.length > 0 &&
						<BankTransactions
							showAccount
							transactions={filteredTransactions}
							openTransactionInModal={this.props.openTransactionInModal}
						/>
					}
					<BankTransactionModal
						EditForm={BankTransactionForm}
						isOpen={this.props.isModalOpen}
						isEdit={true}
						account={''}
						transactions={filteredTransactions} // TODO: need to pass allTransactions for input autocomplete
						dropCategoryList={dropCategoryList}
						dropPayeeList={dropPayeeList}
						resetTransactionForm={this.props.resetTransactionForm}
						deleteTransactionAction={this.props.deleteTransactionAction}
						editTransactionAction={this.props.editTransactionAction}
					/>
				</div>
			</div>
		);
	}
}

Search.propTypes = {
	allAccountTransactions:  PropTypes.object.isRequired,
	categoryList: PropTypes.array.isRequired,
	deleteTransactionAction: PropTypes.func.isRequired,
	editTransactionAction: PropTypes.func.isRequired,
	getAllAccountTransactionsAction: PropTypes.func.isRequired,
	getCategoryListAction: PropTypes.func.isRequired,
	getPayeeListAction: PropTypes.func.isRequired,
	isModalOpen: PropTypes.bool.isRequired,
	openTransactionInModal: PropTypes.func.isRequired,
	payeeList: PropTypes.array.isRequired,
	resetTransactionForm: PropTypes.func.isRequired,
	match: PropTypes.shape({
		params: PropTypes.shape({
			name: PropTypes.string
		}).isRequired
	})
};

const mapStateToProps = state => ({
	allAccountTransactions: state.allAccountTransactions,
	categoryList: state.categoryList,
	payeeList: state.payeeList,
	isModalOpen: state.ui.form.bankTransaction.isModalOpen
});

const mapDispatchToProps = dispatch => ({
	getAllAccountTransactionsAction () {
		dispatch(getAllAccountTransactionsAction());
	},
	getCategoryListAction () {
		dispatch(getCategoryListAction());
	},
	getPayeeListAction () {
		dispatch(getPayeeListAction());
	},
	deleteTransactionAction (data) {
		dispatch(deleteTransactionAction(data, 'search'));
	},
	editTransactionAction (data) {
		dispatch(editTransactionAction(data, 'search'));
	},
	openTransactionInModal (params) {
		dispatch(openTransactionInModal(params));
	},
	resetTransactionForm () {
		dispatch(resetTransactionForm());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Search);
