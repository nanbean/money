import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Link, useLocation, useParams } from 'react-router-dom';

import { CSVLink } from 'react-csv';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import MoneyIcon from '@mui/icons-material/Money';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import Paper from '@mui/material/Paper';

import AccountInvestments from '../components/AccountInvestments';
import Layout from '../components/Layout';
import InvestmentTransactions from '../components/InvestmentTransactions';
import InvestmentTransactionModal from '../components/InvestmentTransactionModal';
import AssetAllocationChart from '../components/AssetAllocationChart';

import useWidth from '../hooks/useWidth';

import { setAccountAction } from '../actions/accountActions';

import {
	getAccountInvestmentsAction
} from '../actions/couchdbAccountActions';
import {
	openTransactionInModal
} from '../actions/ui/form/investmentTransaction';

const linkStyle = {
	textDecoration: 'none',
	color: 'inherit'
};

const csvHeaders = [
	{ label: 'Date', key: 'date' },
	{ label: 'Investment', key: 'investment' },
	{ label: 'Activity', key: 'activity' },
	{ label: 'Quantity', key: 'quantity' },
	{ label: 'Price', key: 'price' },
	{ label: 'Amount', key: 'amount' },
	{ label: 'Commission', key: 'commission' }
];

const getAccountId = pathname => `account${decodeURI(pathname.replace(/\//g, ':'))}`;
const getAccountTransactions = (transactions, accountId) => transactions.filter(i => i.accountId === accountId);
const getCurrencyByAccountId = (accountId, accountList) => {
	const account = accountList.find(account => account._id === accountId);
	return account ? account.currency : undefined;
};

export function Investment () {
	const account = useSelector((state) => state.account);
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);

	const { name } = useParams();
	const { pathname } = useLocation();
	const accountId = useMemo(() => getAccountId(pathname), [pathname]);
	const accountTransactions = useMemo(() => getAccountTransactions(allAccountsTransactions, accountId), [allAccountsTransactions, accountId]);
	const currency = useMemo(() => getCurrencyByAccountId(accountId, accountList), [accountId, accountList]);

	const dispatch = useDispatch();

	const width = useWidth();
	const isSmallScreen = width === 'xs' || width === 'sm';

	useEffect(() => {
		dispatch(setAccountAction(name));
		dispatch(getAccountInvestmentsAction(accountId));
	}, [accountId, dispatch, name]);
	
	const onNewClick = () => {
		dispatch(openTransactionInModal());
	};

	const buttonControls = (
		<Stack spacing={0.5} direction={isSmallScreen ? 'row' : 'column'} alignItems="stretch">
			<Button fullWidth variant="outlined" color="primary" onClick={onNewClick} startIcon={<AddIcon />}>
				New
			</Button>
			<Link to={`/Bank/${account}_Cash`} style={{ ...linkStyle, width: '100%' }}>
				<Button fullWidth variant="outlined" color="primary" startIcon={<MoneyIcon />}>
					Cash
				</Button>
			</Link>
			<CSVLink
				data={accountTransactions}
				headers={csvHeaders}
				filename="transactions.csv"
				style={{ ...linkStyle, width: '100%' }}
			>
				<Button fullWidth variant="outlined" color="primary" startIcon={<FileDownloadIcon />}>
					CSV
				</Button>
			</CSVLink>
		</Stack>
	);
	
	return (
		<Layout title={name}>
			{isSmallScreen ? (
				<Stack sx={{ height: '100%' }}>
					<Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 1 }}>
						{buttonControls}
					</Stack>
					<Box sx={{ flex: 1, overflow: 'hidden' }}>
						<InvestmentTransactions
							transactions={accountTransactions}
							currency={currency}
						/>
					</Box>
					<Box sx={{ flexShrink: 0, mt: 2 }}>
						<AccountInvestments currency={currency} />
					</Box>
				</Stack>
			) : (
				<Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
					<Box sx={{ width: 250, flexShrink: 0 }}>
						<Paper elevation={2} sx={{ p: 2, height: '100%' }}>
							<Stack direction="column" spacing={1}>
								{buttonControls}
							</Stack>
							<Box sx={{ mt: 2 }}>
								<AssetAllocationChart />
							</Box>
						</Paper>
					</Box>
					<Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
						<Box sx={{ flex: 1, overflow: 'hidden' }}>
							<InvestmentTransactions
								transactions={accountTransactions}
								currency={currency}
							/>
						</Box>
						<Box sx={{ flexShrink: 0, mt: 2 }}>
							<AccountInvestments currency={currency} />
						</Box>
					</Box>
				</Box>
			)}
			<InvestmentTransactionModal
				account={account}
				accountId={accountId}
				transactions={accountTransactions}
			/>
		</Layout>
	);
}

export default Investment;
