import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

import BankTransactionForm from './BankTransactionForm';

import {
	resetTransactionForm
} from '../actions/ui/form/bankTransaction';

export function BankTransactionModal ({
	account = '',
	accountId,
	transactions
}) {
	const dropCategoryList = useSelector((state) => state.dropCategoryList);
	const dropPayeeList = useSelector((state) => state.dropPayeeList);
	const isEdit = useSelector((state) => state.ui.form.bankTransaction.isEdit);
	const isOpen = useSelector((state) => state.ui.form.bankTransaction.isModalOpen);
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
				{
					isOpen &&
					<BankTransactionForm
						account={account}
						accountId={accountId}
						transactions={transactions}
						dropCategoryList={dropCategoryList}
						dropPayeeList={dropPayeeList}
					/>
				}
			</DialogContent>
		</Dialog>
	);
}

BankTransactionModal.propTypes = {
	account: PropTypes.string,
	accountId: PropTypes.string,
	transactions: PropTypes.array
};

export default BankTransactionModal;