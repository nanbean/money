import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Link, useLocation, useParams } from 'react-router-dom';

import { CSVLink } from 'react-csv';

import { styled } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import MoneyIcon from '@mui/icons-material/Money';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import AccountInvestments from './AccountInvestments';
import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';
import InvestmentTransactions from '../components/InvestmentTransactions';
import InvestmentTransactionModal from '../components/InvestmentTransactionModal';
import InvestmentTransactionForm from '../components/InvestmentTransactionForm';

import useHeight from '../hooks/useHeight';

import { setAccountAction } from '../actions/accountActions';

import {
	getAccountInvestmentsAction
} from '../actions/couchdbActions';
import {
	openTransactionInModal
} from '../actions/ui/form/investmentTransaction';

const linkStyle = {
	textDecoration: 'none',
	color: 'inherit'
};

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

const csvHeaders = [
	{ label: 'Date', key: 'date' },
	{ label: 'Investment', key: 'investment' },
	{ label: 'Activity', key: 'activity' },
	{ label: 'Quantity', key: 'quantity' },
	{ label: 'Price', key: 'price' },
	{ label: 'Amount', key: 'amount' },
	{ label: 'Commission', key: 'commission' }
];

const ROW_HEIGHT = 60;

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
	const dropInvestmentList = useSelector((state) => state.dropInvestmentList);
	const isEdit = useSelector((state) => state.ui.form.investmentTransaction.isEdit);
	const isModalOpen = useSelector((state) => state.ui.form.investmentTransaction.isModalOpen);
	const accountInvestments = useSelector((state) => state.accountInvestments);
	const performanceRowCount = accountInvestments.filter(i => i.quantity > 0).length + 3; // 3 : Header, Cash, Total
	const transactionsHeight = useHeight() - ROW_HEIGHT * performanceRowCount - 64 - 64 - 56; // TODO: Optimize calculation

	const { name } = useParams();
	const { pathname } = useLocation();
	const accountId = useMemo(() => getAccountId(pathname), [pathname]);
	const accountTransactions = useMemo(() => getAccountTransactions(allAccountsTransactions, accountId), [allAccountsTransactions, accountId]);
	const currency = useMemo(() => getCurrencyByAccountId(accountId, accountList), [accountId, accountList]);

	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(setAccountAction(name));
		dispatch(getAccountInvestmentsAction(accountId));
	}, [accountId, dispatch, name]);
	
	const onNewClick = () => {
		dispatch(openTransactionInModal());
	};

	return (
		<React.Fragment>
			<TitleHeader title={account} />
			<Container>
				<Paper>
					<Sticky>
						<div style={{ display: 'inline-block', width: '35%' }}>
							<Button
								fullWidth
								variant="outlined"
								color="primary"
								onClick={onNewClick}
								sx={{ backdropFilter: 'blur(5px)' }}
							>
								New
								<AddIcon
									sx={(theme) => ({
										marginLeft: theme.spacing(1)
									})}
								/>
							</Button>
						</div>
						<div style={{ display: 'inline-block', width: '35%' }}>
							<Link to={`/Bank/${account}_Cash`} style={linkStyle}>
								<Button
									fullWidth
									variant="outlined"
									color="primary"
									sx={{ backdropFilter: 'blur(5px)' }}
								>
									Cash
									<MoneyIcon
										sx={(theme) => ({
											marginLeft: theme.spacing(1)
										})}
									/>
								</Button>
							</Link>
						</div>
						<div style={{ display: 'inline-block', width: '30%' }}>
							<CSVLink
								data={accountTransactions}
								headers={csvHeaders}
								filename="transactions.csv"
								style={{ color: 'inherit', textDecoration: 'none' }}
							>
								<Button
									fullWidth
									variant="outlined"
									color="primary"
									sx={{ backdropFilter: 'blur(5px)' }}
								>
									CSV
									<FileDownloadIcon
										sx={(theme) => ({
											marginLeft: theme.spacing(1)
										})}
									/>
								</Button>
							</CSVLink>
						</div>
					</Sticky>
					<Box sx={{ height: transactionsHeight, textAlign: 'center' }}>
						<InvestmentTransactions
							transactions={accountTransactions}
							currency={currency}
						/>
					</Box>

					<InvestmentTransactionModal
						EditForm={InvestmentTransactionForm}
						isOpen={isModalOpen}
						isEdit={isEdit}
						account={account}
						accountId={accountId}
						transactions={accountTransactions}
						autocompleteInvestmentList={dropInvestmentList}
					/>
					<AccountInvestments currency={currency} />
				</Paper>
			</Container>
		</React.Fragment>
	);
}

export default Investment;
