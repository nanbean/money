import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';

import Amount from '../../components/Amount';

import { TYPE_ICON } from '../../constants';

import {
	openTransactionInModal
} from '../../actions/ui/form/bankTransaction';

const isPaidFromTransactions = (payment, allAccountsTransactions) => {
	if (!allAccountsTransactions.length) return true;

	const thisYearMonth = moment().format('YYYY-MM');

	return allAccountsTransactions.find(i => {
		if (payment.account === i.account && payment.payee === i.payee && payment.category === i.category) {
			if (!payment.subcategory || payment.subcategory === i.subcategory) {
				const paidYearMonth = moment(i.date).format('YYYY-MM');
				if (thisYearMonth === paidYearMonth) {
					return true;
				}
			}
		}
		return false;
	});
};

export function PaymentList () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const paymentList = useSelector((state) => state.settings.paymentList);
	const filteredPaymentList = useMemo(() => paymentList.filter(i => i.valid && !isPaidFromTransactions(i, allAccountsTransactions)), [paymentList, allAccountsTransactions]);
	const dispatch = useDispatch();

	const onRowSelect = (index) => () => {
		const transaction = filteredPaymentList[index];

		dispatch(openTransactionInModal({
			account: transaction.account,
			accountId: transaction.accountId,
			date: moment().date(transaction.day).format('YYYY-MM-DD'),
			payee: transaction.payee,
			category: transaction.category + (transaction.subcategory ? `:${transaction.subcategory}` : ''),
			amount: transaction.amount,
			memo: transaction.memo,
			index: index
		}));
	};

	return (
		<Box p={{ xs:1 }}>
			<Table>
				<TableBody>
					{
						filteredPaymentList.map((i, index) => {
							const payDay = moment().date(i.day);
							const nowDay = moment();
							const accountType = i.accountId.includes(':') ? i.accountId.split(':')[1] : undefined;
							return (
								<TableRow key={index} onClick={onRowSelect(index)}>
									<TableCell align="left">
										<Box>
											{i.payee}
											<Stack direction="row" justifyContent="left" alignItems="center" spacing={0.5}>
												{accountType && TYPE_ICON[accountType]}
												<Typography variant="caption">
													{i.account}
												</Typography >
											</Stack>
										</Box>
									</TableCell>
									<TableCell align="right">
										<Box>
											<Amount value={i.amount} showOriginal showSymbol currency={i.currency}/>
											<Typography variant="caption" sx={{ color: payDay < nowDay ? 'warning.main': 'grey.500' }}>
												{payDay.format('On MM-DD')}
											</Typography>
										</Box>
									</TableCell>
								</TableRow>
							);
						})
					}
				</TableBody>
			</Table>
			{
				filteredPaymentList.length === 0 && <Box p={{ xs:1 }} display="flex" justifyContent="center" alignItems="center">
					<Typography variant="caption" sx={{ color: 'grey.500' }}>
						No Payment
					</Typography>
				</Box>
			}
		</Box>
	);
}

export default PaymentList;
