import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

import Amount from '../../components/Amount';

import { TYPE_ICON_MAP } from '../../constants';

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
			{
				filteredPaymentList.map((i, index) => {
					const payDay = moment().date(i.day);
					const nowDay = moment();
					const accountType = i.accountId.includes(':') ? i.accountId.split(':')[1] : undefined;
					const IconComponent = TYPE_ICON_MAP[accountType];

					return (
						<Stack
							key={index}
							direction="row"
							justifyContent="space-between"
							alignItems="center"
							onClick={onRowSelect(index)}
							sx={{ cursor: 'pointer', p: 1, borderRadius: 1, '&:hover': { backgroundColor: 'action.hover' } }}
						>
							<Box>
								<Typography variant="body2">{i.payee}</Typography>
								<Stack direction="row" justifyContent="left" alignItems="center" spacing={0.5}>
									{accountType && IconComponent && <IconComponent sx={{ fontSize: 12 }} />}
									<Typography variant="caption">{i.account}</Typography>
								</Stack>
							</Box>
							<Stack alignItems="flex-end">
								<Amount value={i.amount} showOriginal showSymbol currency={i.currency}/>
								<Typography variant="caption" sx={{ color: payDay < nowDay ? 'warning.main': 'grey.500' }}>
									{payDay.format('On MM-DD')}
								</Typography>
							</Stack>
						</Stack>
					);
				})
			}
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
