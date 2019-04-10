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
				investmentAccountTransactions={props.investmentAccountTransactions}
				autocompleteInvestmentList={props.autocompleteInvestmentList}
				addInvestmentTransactionAction={props.addInvestmentTransactionAction}
				deleteInvestmentTransactionAction={props.deleteInvestmentTransactionAction}
				editInvestmentTransactionAction={props.editInvestmentTransactionAction}
			/>
		</DialogContent>
	</Dialog>
);

InvestmentTransactionModal.propTypes = {
	account: PropTypes.string,
	addInvestmentTransactionAction: PropTypes.func,
	autocompleteInvestmentList: PropTypes.array,
	deleteInvestmentTransactionAction: PropTypes.func,
	EditForm: PropTypes.func,
	editInvestmentTransactionAction: PropTypes.func,
	investmentAccountTransactions: PropTypes.array,
	isEdit: PropTypes.bool,
	isOpen: PropTypes.bool,
	resetTransactionForm: PropTypes.func
};

export default InvestmentTransactionModal;
