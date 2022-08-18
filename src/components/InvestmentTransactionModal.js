import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

import {
	resetTransactionForm
} from '../actions/ui/form/bankTransaction';

export function InvestmentTransactionModal ({
	account,
	accountId,
	autocompleteInvestmentList,
	EditForm,
	isEdit,
	isOpen,
	transactions
}) {
	const dispatch = useDispatch();

	const onClose = () => {
		dispatch(resetTransactionForm());
	};

	return (
		<Dialog
			open={isOpen}
			onClose={onClose}
			aria-labelledby="form-dialog-title"
		>
			<DialogTitle id="form-dialog-title">{isEdit ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
			<DialogContent>
				<EditForm
					account={account}
					accountId={accountId}
					transactions={transactions}
					autocompleteInvestmentList={autocompleteInvestmentList}
				/>
			</DialogContent>
		</Dialog>
	);
}

InvestmentTransactionModal.propTypes = {
	account: PropTypes.string.isRequired,
	accountId: PropTypes.string.isRequired,
	autocompleteInvestmentList: PropTypes.array,
	EditForm: PropTypes.func,
	isEdit: PropTypes.bool,
	isOpen: PropTypes.bool,
	transactions: PropTypes.array
};

export default InvestmentTransactionModal;
