import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import FormControl from '@mui/material/FormControl';
import Input from '@mui/material/Input';
import InputAdornment from '@mui/material/InputAdornment';

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

 	const [endDate, setEndDate] = React.useState('');

 	const accountTransactions = useMemo(() => {
 		let tx = getAccountTransactions(allAccountsTransactions, accountId);
 		if (endDate) {
 			tx = tx.filter(i => i.date <= endDate);
 		}
 		return tx;
 	}, [allAccountsTransactions, accountId, endDate]);

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
					<Amount value={balance} size="small" showSymbol showOriginal currency={currency} />
				</Typography>
			}
		/>
	);

	const newControls = (
		<Button variant="outlined" color="primary" onClick={onNewClick} startIcon={<AddIcon />}>
			New
		</Button>
	);

	const endDateControl = (
		<FormControl fullWidth>
			<Input
				type="date"
				name="endDate"
				placeholder="End Date"
				value={endDate}
				fullWidth
				onChange={e => setEndDate(e.target.value)}
				startAdornment={
					<InputAdornment position="start">
						To
					</InputAdornment>
				}
			/>
		</FormControl>
	);

	return (
		<Layout title={name}>
			{isSmallScreen ? (
				<>
					<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5} sx={{ mb: 1 }}>
						<Box sx={{ flexBasis: '50%' }}>
							{balanceSummary}
						</Box>
						<Box sx={{ flexBasis: '30%' }}>
							{endDateControl}
						</Box>
						<Box sx={{ flexBasis: '20%', textAlign: 'center' }}>
							{newControls}
						</Box>
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
					<Box sx={{ width: 250, flexShrink: 0 }}>
						<Paper elevation={2} sx={{ p: 2, height: '100%' }}>
							<Stack direction="column" spacing={1}>
								{newControls}
								{balanceSummary}
								{endDateControl}
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
