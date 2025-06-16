import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import BankTransactionModal from '../../components/BankTransactionModal';
import Payee from '../../components/Payee';
import Amount from '../../components/Amount';

import {
	openTransactionInModal
} from '../../actions/ui/form/bankTransaction';

import { TYPE_ICON } from '../../constants';

const updateTransactionsWithAccounts = (transactions, accounts) => {
	if (!accounts.length || !transactions.length) return [];

	return transactions.map(transaction => {
		const account = accounts.find(account => account._id === transaction.accountId);
		return account ? { ...transaction, currency: account.currency } : transaction;
	});
};

export function LastTransactions () {
	const accountList = useSelector((state) => state.accountList);
	const latestTransactions = useSelector((state) => state.latestTransactions);
	const updatedTransactions = useMemo(() => updateTransactionsWithAccounts(latestTransactions, accountList), [accountList, latestTransactions]);
	const dispatch = useDispatch();

	const onRowSelect = (index) => () => {
		const transaction = updatedTransactions[index];

		dispatch(openTransactionInModal({
			account: transaction.account,
			date: transaction.date,
			payee: transaction.payee,
			category: transaction.category + (transaction.subcategory ? `:${transaction.subcategory}` : ''),
			amount: transaction.amount,
			memo: transaction.memo,
			isEdit: true,
			index: index
		}));
	};

	return (
		<Box p={{ xs:1 }}>
			<Table>
				<TableBody>
					{updatedTransactions && updatedTransactions.map((row, index) => (
						<TableRow key={index} onClick={onRowSelect(index)}>
							<TableCell component="th" scope="row" align="left">
								<Payee category={row.category} value={row.payee} />
								<Stack direction="row" justifyContent="left" alignItems="center" spacing={0.5}>
									{TYPE_ICON[row.type]}
									<Typography variant="caption">
										{row.account}
									</Typography >
								</Stack>
							</TableCell>
							<TableCell align="right">
								<Box>
									<Amount value={row.amount} currency={row.currency} showSymbol/>
								</Box>
								<Typography variant="caption" sx={{ color: 'grey.500' }}>
									{moment(row.date).format('MM-DD')}
								</Typography>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<BankTransactionModal
				isEdit={true}
				transactions={latestTransactions}
			/>
		</Box>
	);
}

export default LastTransactions;
