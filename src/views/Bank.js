import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';

import AddIcon from '@mui/icons-material/Add';

import Layout from '../components/Layout';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';
import Amount from '../components/Amount';

import useWidth from '../hooks/useWidth';

import { setAccountAction } from
	'../actions/accountActions';

import { openTransactionInModal } from '../actions/ui/form/bankTransaction';

const getAccountId = pathname =>
	`account${decodeURI(pathname.replace(/\//g, ':')).replace(/%20/g, ' ')}`;
const getAccountTransactions = (transactions, accountId) =>
	transactions.filter(i => i.accountId === accountId);
const getCurrencyByAccountId = (accountId, accountList) => {
	const account = accountList.find(account => account._id === accountId);
	return account ? account.currency : undefined;
};

export function Bank () {
	const account = useSelector((state) => state.account);
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector(
		(state) => state.allAccountsTransactions);
	const width = useWidth();
	const isSmallScreen = width === 'xs' || width === 'sm';

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

	const balanceSummary = (
		<Chip
			variant="outlined"
			label={
				<Typography variant="subtitle">
					Balance: <Amount value={balance} size="small" showSymbol currency={currency} />
				</Typography>
			}
		/>
	);

	const newControls = (
		<Button variant="outlined" color="primary" onClick={onNewClick} startIcon={<AddIcon />}>
			New
		</Button>
	);

	return (
		<Layout title={name}>
			{isSmallScreen ? (
				<>
					<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
						{balanceSummary}
						{newControls}
					</Stack>
					<Box sx={{ flex: 1, mt: 1, textAlign: 'center' }}>
						<BankTransactions
							account={account}
							currency={currency}
							transactions={accountTransactions}
						/>
					</Box>
				</>
			) : (
				<Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
					<Box sx={{ width: 240, flexShrink: 0 }}>
						<Paper elevation={2} sx={{ p: 2, height: '100%' }}>
							<Stack direction="column" spacing={1}>
								{newControls}
								{balanceSummary}
							</Stack>
						</Paper>
					</Box>
					<Box sx={{ flex: 1 }}>
						<BankTransactions
							account={account}
							currency={currency}
							transactions={accountTransactions}
						/>
					</Box>
				</Box>
			)}
			<BankTransactionModal
				accountId={accountId}
				account={account}
				transactions={accountTransactions}
			/>
		</Layout>
	);
}


export default Bank;
