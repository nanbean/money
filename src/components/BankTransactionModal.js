import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';

import BankTransactionForm from './BankTransactionForm';

import {
	addTransactionAction,
	deleteTransactionAction,
	editTransactionAction,
	getPayeeListAction,
	getCategoryListAction
} from '../actions/couchdbActions';
import {
	resetTransactionForm
} from '../actions/ui/form/bankTransaction';

class BankTransactionModal extends Component {
	render () {
		const {
			account,
			accountId,
			dropCategoryList,
			dropPayeeList,
			isEdit,
			isOpen,
			transactions
		} = this.props;

		return (
			<Dialog
				open={isOpen}
				onClose={this.props.resetTransactionForm}
				aria-labelledby="form-dialog-title"
			>
				<DialogTitle id="form-dialog-title">{isEdit ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
				<DialogContent>
					{
						isOpen &&
						<BankTransactionForm
							account={account}
							accountId={accountId}
							transactions={transactions}
							dropCategoryList={dropCategoryList}
							dropPayeeList={dropPayeeList}
							addTransactionAction={this.props.addTransactionAction}
							deleteTransactionAction={this.props.deleteTransactionAction}
							editTransactionAction={this.props.editTransactionAction}
						/>
					}
				</DialogContent>
			</Dialog>
		);
	}
}

BankTransactionModal.propTypes = {
	account: PropTypes.string,
	accountId: PropTypes.string,
	addTransactionAction: PropTypes.func,
	deleteTransactionAction: PropTypes.func,
	dropCategoryList: PropTypes.array,
	dropPayeeList: PropTypes.array,
	editTransactionAction: PropTypes.func,
	getCategoryListAction: PropTypes.func,
	getPayeeListAction: PropTypes.func,
	isEdit: PropTypes.bool,
	isOpen: PropTypes.bool,
	resetTransactionForm: PropTypes.func,
	transactions: PropTypes.array
};

BankTransactionModal.defaultProps = {
	account: ''
};


const mapStateToProps = state => ({
	dropCategoryList: state.dropCategoryList,
	dropPayeeList: state.dropPayeeList,
	isEdit: state.ui.form.bankTransaction.isEdit,
	isOpen: state.ui.form.bankTransaction.isModalOpen
});

const mapDispatchToProps = dispatch => ({
	getCategoryListAction () {
		dispatch(getCategoryListAction());
	},
	getPayeeListAction () {
		dispatch(getPayeeListAction());
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
	resetTransactionForm () {
		dispatch(resetTransactionForm());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(BankTransactionModal);