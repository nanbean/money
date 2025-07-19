import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

import InvestmentTransactionForm from './InvestmentTransactionForm';

import {
	resetTransactionForm
} from '../actions/ui/form/investmentTransaction';

export function InvestmentTransactionModal ({
	account,
	accountId,
	transactions
}) {
	const dispatch = useDispatch();
	const isEdit = useSelector((state) => state.ui.form.investmentTransaction.isEdit);
	const isOpen = useSelector((state) => state.ui.form.investmentTransaction.isModalOpen);
	const autocompleteInvestmentList = useSelector((state) => state.dropInvestmentList);

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
				<InvestmentTransactionForm
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
	transactions: PropTypes.array
};

export default InvestmentTransactionModal;
