import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useLocation } from 'react-router-dom';

import { styled } from '@mui/material/styles';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import AddIcon from '@mui/icons-material/Add';

import Layout from '../components/Layout';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';
import BankTransactionForm from '../components/BankTransactionForm';
import Amount from '../components/Amount';

import { setAccountAction } from '../actions/accountActions';
import { openTransactionInModal } from '../actions/ui/form/bankTransaction';

const Sticky = styled('div')(({ theme }) => ({
	width: '100%',
	position: 'sticky',
	zIndex: theme.zIndex.drawer + 1,
	[theme.breakpoints.down('sm')]: {
		top: 56
	},
	[theme.breakpoints.up('sm')]: {
		top: 64
	}
}));

const getAccountId = pathname => `account${decodeURI(pathname.replace(/\//g, ':')).replace(/%20/g, ' ')}`;
const getAccountTransactions = (transactions, accountId) => transactions.filter(i => i.accountId === accountId);
const getCurrencyByAccountId = (accountId, accountList) => {
	const account = accountList.find(account => account._id === accountId);
	return account ? account.currency : undefined;
};

export function Bank () {
	const account = useSelector((state) => state.account);
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const isModalOpen = useSelector((state) => state.ui.form.bankTransaction.isModalOpen,);
	const isEdit = useSelector((state) => state.ui.form.bankTransaction.isEdit);

	let { name } = useParams();
	let { pathname } = useLocation();
	const accountId = useMemo(() => getAccountId(pathname), [pathname]);
	const accountTransactions = useMemo(() => getAccountTransactions(allAccountsTransactions, accountId), [allAccountsTransactions, accountId]);
	const currency = useMemo(() => getCurrencyByAccountId(accountId, accountList), [accountId, accountList]);
	const balance = accountTransactions.length > 0 && accountTransactions.map((i) => i.amount).reduce( (a, b) => a + b );

	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(setAccountAction(name));
	}, [name, dispatch]);

	const onNewClick = () => {
		dispatch(openTransactionInModal());
	};

	return (
		<Layout title={name}>
			<Sticky>
				<Button
					fullWidth
					variant="outlined"
					color="primary"
					onClick={onNewClick}
				>
					New
					<AddIcon
						sx={(theme) => ({
							marginLeft: theme.spacing(1)
						})}
					/>
				</Button>
			</Sticky>
			<Box sx={{ flex: 1, mt: 1, textAlign: 'center' }}>
				<BankTransactions
					account={account}
					currency={currency}
					transactions={accountTransactions}
				/>
			</Box>
			<Stack direction="row" sx={{ justifyContent: 'flex-end', alignItems: 'baseline' }}>
				<Typography
					variant="subtitle1"
					gutterBottom
					align="right"
					sx={{ mt: 1, mb: 1 }}
				>
					{'Balance : '}
				</Typography>
				<Amount value={balance} size="large" negativeColor showSymbol showOriginal currency={currency}/>
			</Stack>
			<BankTransactionModal
				EditForm={BankTransactionForm}
				isOpen={isModalOpen}
				isEdit={isEdit}
				accountId={accountId}
				account={account}
				transactions={accountTransactions}
			/>
		</Layout>
	);
}

export default Bank;
