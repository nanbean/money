import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button } from 'semantic-ui-react';

import AccountInvestments from './AccountInvestments';
import TitleHeader from '../components/TitleHeader';
import InvestmentTransactions from '../components/InvestmentTransactions';
import InvestmentTransactionModal from '../components/InvestmentTransactionModal';
import InvestmentTransactionForm from '../components/InvestmentTransactionForm';

import { setAccount } from '../actions/accountActions';
import {
	 getInvestmentListAction,
	 getAllInvestmentsTransactionsAction,
	 getAllInvestmentsPriceAction,
	 getInvestmentAccountTransactionsAction,
	 getAccountInvestmentsAction,
	 addInvestmentTransactionAction,
	 deleteInvestmentTransactionAction,
	 editInvestmentTransactionAction
 } from '../actions/investmentActions';
 import {
 	openTransactionInModal,
 	resetTransactionForm,
} from '../actions/ui/form/investmentTransaction';

export class Investment extends Component {
	componentWillMount () {
		const { match } = this.props;
		const name = match && match.params && match.params.name;

		this.props.setAccount(name);
		this.props.getAllInvestmentsTransactionsAction();
		this.props.getAllInvestmentsPriceAction();
		this.props.getInvestmentAccountTransactionsAction(name);
		this.props.getInvestmentListAction();
		this.props.getAccountInvestmentsAction(name);
	}

	render () {
		const { isMobile, account, investmentList, investmentAccountTransactions } = this.props;
		const autocompleteInvestmentList = investmentList.map(i => { return {key: i.symbol, name: i.name}});

		return (
			<div>
				<TitleHeader title={account} />
				<div className='container-full-page'>
					<div className="container-header">
						<Button.Group basic fluid>
							<Button
								icon="plus"
								labelPosition="right"
								content="New"
								onClick={this.props.openTransactionInModal}
							/>
							<Link to={`/bank/${account}_Cash`}>
								<Button
									icon="right arrow"
		              labelPosition="right"
		              content="Cash"
								/>
							</Link>
						</Button.Group>
					</div>
					<InvestmentTransactions
						isMobile={isMobile}
						investmentAccountTransactions={investmentAccountTransactions}
						openTransactionInModal={this.props.openTransactionInModal}
					/>

					<InvestmentTransactionModal
						EditForm={InvestmentTransactionForm}
						isOpen={this.props.isModalOpen}
						isEdit={this.props.isEdit}
						account={account}
						investmentAccountTransactions={investmentAccountTransactions}
						autocompleteInvestmentList={autocompleteInvestmentList}
						resetTransactionForm={this.props.resetTransactionForm}
						addInvestmentTransactionAction={this.props.addInvestmentTransactionAction}
						deleteInvestmentTransactionAction={this.props.deleteInvestmentTransactionAction}
						editInvestmentTransactionAction={this.props.editInvestmentTransactionAction}
					/>
					<AccountInvestments />
				</div>
			</div>
		);
	}
}

Investment.propTypes = {
	isMobile: PropTypes.bool.isRequired,
	account: PropTypes.string.isRequired,
	investmentList: PropTypes.array.isRequired,
	accountInvestments: PropTypes.array.isRequired,
	investmentAccountTransactions: PropTypes.array.isRequired,
	getInvestmentAccountTransactionsAction: PropTypes.func.isRequired,
	addInvestmentTransactionAction: PropTypes.func.isRequired,
	deleteInvestmentTransactionAction: PropTypes.func.isRequired,
	editInvestmentTransactionAction: PropTypes.func.isRequired,
	getInvestmentListAction: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
	isMobile: state.ui.isMobile,
	account: state.account,
	accountInvestments: state.accountInvestments,
	investmentList: state.investmentList,
	investmentAccountTransactions: state.investmentAccountTransactions,
	isModalOpen: state.ui.form.investmentTransaction.isModalOpen,
	isEdit: state.ui.form.investmentTransaction.isEdit
});

const mapDispatchToProps = dispatch => ({
	getAllInvestmentsTransactionsAction () {
		dispatch(getAllInvestmentsTransactionsAction());
	},
	getAllInvestmentsPriceAction () {
		dispatch(getAllInvestmentsPriceAction());
	},
	getInvestmentListAction () {
		dispatch(getInvestmentListAction());
	},
	getAccountInvestmentsAction (params) {
		dispatch(getAccountInvestmentsAction(params));
	},
	getInvestmentAccountTransactionsAction (params) {
		dispatch(getInvestmentAccountTransactionsAction(params));
	},
	addInvestmentTransactionAction (params) {
		dispatch(addInvestmentTransactionAction(params));
	},
	deleteInvestmentTransactionAction (params) {
		dispatch(deleteInvestmentTransactionAction(params));
	},
	editInvestmentTransactionAction (params) {
		dispatch(editInvestmentTransactionAction(params));
	},
	setAccount (params) {
		dispatch(setAccount(params));
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
)(Investment);
