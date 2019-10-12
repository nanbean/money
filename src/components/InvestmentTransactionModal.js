import React from 'react';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';

const InvestmentTransactionModal = props => (
	<Dialog
		open={props.isOpen}
		onClose={props.resetTransactionForm}
		aria-labelledby="form-dialog-title"
	>
		<DialogTitle id="form-dialog-title">{props.isEdit ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
		<DialogContent>
			<props.EditForm
				account={props.account}
				accountId={props.accountId}
				transactions={props.transactions}
				autocompleteInvestmentList={props.autocompleteInvestmentList}
				addTransactionAction={props.addTransactionAction}
				editTransactionAction={props.editTransactionAction}
				deleteTransactionAction={props.deleteTransactionAction}
			/>
		</DialogContent>
	</Dialog>
);

InvestmentTransactionModal.propTypes = {
	account: PropTypes.string.isRequired,
	accountId: PropTypes.string.isRequired,
	addTransactionAction: PropTypes.func,
	autocompleteInvestmentList: PropTypes.array,
	deleteTransactionAction: PropTypes.func,
	EditForm: PropTypes.func,
	editTransactionAction: PropTypes.func,
	isEdit: PropTypes.bool,
	isOpen: PropTypes.bool,
	resetTransactionForm: PropTypes.func,
	transactions: PropTypes.array
};

export default InvestmentTransactionModal;
