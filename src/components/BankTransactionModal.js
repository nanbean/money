import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';

import BankTransactionForm from './BankTransactionForm';

import { getCategoryListAction } from '../actions/categoryActions';
import { getPayeeListAction } from '../actions/payeeActions';

import {
	addTransactionAction,
	deleteTransactionAction,
	editTransactionAction
} from '../actions/transactionActions';
import {
	resetTransactionForm
} from '../actions/ui/form/bankTransaction';

class BankTransactionModal extends Component {
	componentDidMount () {
		const { dropCategoryList, dropPayeeList } = this.props;

		if (dropCategoryList.length < 1) {
			this.props.getCategoryListAction();
		}

		if (dropPayeeList.length < 1) {
			this.props.getPayeeListAction();
		}
	}

	render () {
		const {
			account,
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