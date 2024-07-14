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

import {
	openTransactionInModal
} from '../../actions/ui/form/bankTransaction';

import useWidth from '../../hooks/useWidth';

import { toCurrencyFormatWithSymbol } from '../../utils/formatting';

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
	const width = useWidth();
	const isWidthDownLg = width === 'xs' || width === 'sm' || width === 'md' || width === 'lg';

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
								<Stack direction="row" justifyContent="left" alignItems="center" spacing={1}>
									{TYPE_ICON[row.type]}
									<Typography variant="body2">
										{row.account}
									</Typography >
								</Stack>
							</TableCell>
							{
								!isWidthDownLg &&  <TableCell align="center">
									<span>
										{moment(row.date).format('MM-DD')}
									</span>
								</TableCell>
							}
							<TableCell align="center">
								<Payee category={row.category} value={row.payee} />
							</TableCell>
							<TableCell align="right">
								<Box>
									{toCurrencyFormatWithSymbol(row.amount, row.currency)}
								</Box>
								{
									isWidthDownLg && <Typography variant="caption" sx={{ color: 'rgb(158, 158, 164)' }}>
										{moment(row.date).format('MM-DD')}
									</Typography>
								}
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
