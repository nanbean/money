import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import Amount from '../../components/Amount';
import BankTransactionModal from '../../components/BankTransactionModal';
import Payee from '../../components/Payee';

import {
	openTransactionInModal
} from '../../actions/ui/form/bankTransaction';

import { TYPE_EMOJI } from '../../constants';

export function LastTransactions () {
	const latestTransactions = useSelector((state) => state.latestTransactions);
	const dispatch = useDispatch();

	const onRowSelect = (index) => () => {
		const transaction = latestTransactions[index];

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
		<React.Fragment>
			<Table>
				<TableHead>
					<TableRow>
						<TableCell align="center">Account</TableCell>
						<TableCell align="center">Date</TableCell>
						<TableCell align="center">Payee</TableCell>
						<TableCell align="center">Amount</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{latestTransactions && latestTransactions.map((row, index) => (
						<TableRow key={index} onClick={onRowSelect(index)}>
							<TableCell component="th" scope="row" align="center">
								<span>
									{`${TYPE_EMOJI[row.type]} ${row.account}`}
								</span>
							</TableCell>
							<TableCell align="center">
								<span>
									{moment(row.date).format('MM-DD')}
								</span>
							</TableCell>
							<TableCell align="center">
								<Payee category={row.category} value={row.payee} />
							</TableCell>
							<TableCell align="center"><Amount value={row.amount} /></TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<BankTransactionModal
				isEdit={true}
				transactions={latestTransactions}
			/>
		</React.Fragment>
	);
}

export default LastTransactions;
