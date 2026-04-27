import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';

import CloseIcon from '@mui/icons-material/Close';

import BankTransactionForm from './BankTransactionForm';

import useT from '../hooks/useT';
import { sDisplay } from '../utils/designTokens';

import {
	resetTransactionForm
} from '../actions/ui/form/bankTransaction';

export function BankTransactionModal ({
	account = '',
	accountId,
	transactions
}) {
	const T = useT();

	const isEdit = useSelector((state) => state.ui.form.bankTransaction.isEdit);
	const isOpen = useSelector((state) => state.ui.form.bankTransaction.isModalOpen);
	const payee = useSelector((state) => state.ui.form.bankTransaction.payee);
	const dispatch = useDispatch();

	const onClose = () => dispatch(resetTransactionForm());

	return (
		<Dialog
			open={isOpen}
			onClose={onClose}
			fullWidth
			maxWidth="sm"
			PaperProps={{
				sx: {
					background: T.surf,
					border: `1px solid ${T.rule}`,
					borderRadius: '20px',
					color: T.ink
				}
			}}
		>
			<Box sx={{ padding: { xs: '20px', md: '28px' } }}>
				{/* Header */}
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ marginBottom: 2.5 }}>
					<Box>
						<Typography sx={{
							fontSize: 11,
							color: T.ink3,
							textTransform: 'uppercase',
							letterSpacing: '0.08em',
							fontWeight: 600
						}}>
							{isEdit ? 'Edit transaction' : 'New transaction'}
						</Typography>
						<Typography sx={{ ...sDisplay, fontSize: 22, fontWeight: 700, marginTop: '4px', color: T.ink }}>
							{isEdit ? (payee || 'Transaction') : 'Add a transaction'}
						</Typography>
					</Box>
					<IconButton
						onClick={onClose}
						size="small"
						sx={{ background: T.rule, color: T.ink2, '&:hover': { background: T.surf2 } }}
					>
						<CloseIcon sx={{ fontSize: 18 }} />
					</IconButton>
				</Stack>

				{isOpen && (
					<BankTransactionForm
						account={account}
						accountId={accountId}
						transactions={transactions}
						onClose={onClose}
					/>
				)}
			</Box>
		</Dialog>
	);
}

BankTransactionModal.propTypes = {
	account: PropTypes.string,
	accountId: PropTypes.string,
	transactions: PropTypes.array
};

export default BankTransactionModal;
