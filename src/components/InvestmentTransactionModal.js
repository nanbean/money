import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';

import CloseIcon from '@mui/icons-material/Close';

import InvestmentTransactionForm from './InvestmentTransactionForm';

import useT from '../hooks/useT';
import { sDisplay } from '../utils/designTokens';

import {
	resetTransactionForm
} from '../actions/ui/form/investmentTransaction';

export function InvestmentTransactionModal ({
	account,
	accountId,
	transactions
}) {
	const T = useT();

	const dispatch = useDispatch();
	const isEdit = useSelector((state) => state.ui.form.investmentTransaction.isEdit);
	const isOpen = useSelector((state) => state.ui.form.investmentTransaction.isModalOpen);
	const investment = useSelector((state) => state.ui.form.investmentTransaction.investment);
	const autocompleteInvestmentList = useSelector((state) => state.dropInvestmentList);

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
							{isEdit ? (investment || 'Investment transaction') : 'Add a transaction'}
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
					<InvestmentTransactionForm
						account={account}
						accountId={accountId}
						transactions={transactions}
						autocompleteInvestmentList={autocompleteInvestmentList}
						onClose={onClose}
					/>
				)}
			</Box>
		</Dialog>
	);
}

InvestmentTransactionModal.propTypes = {
	account: PropTypes.string.isRequired,
	accountId: PropTypes.string.isRequired,
	transactions: PropTypes.array
};

export default InvestmentTransactionModal;
