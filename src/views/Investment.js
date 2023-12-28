import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Link, useLocation, useParams } from 'react-router-dom';

import { styled } from '@mui/material/styles';

import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import MoneyIcon from '@mui/icons-material/Money';

import AccountInvestments from './AccountInvestments';
import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';
import InvestmentTransactions from '../components/InvestmentTransactions';
import InvestmentTransactionModal from '../components/InvestmentTransactionModal';
import InvestmentTransactionForm from '../components/InvestmentTransactionForm';

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

const getAccountId = pathname => `account${decodeURI(pathname.replace(/\//g, ':'))}`;
const getAccountTransactions = (transactions, accountId) => transactions.filter(i => i.accountId === accountId);

export function Investment () {
	const account = useSelector((state) => state.account);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const dropInvestmentList = useSelector((state) => state.dropInvestmentList);
	const isEdit = useSelector((state) => state.ui.form.investmentTransaction.isEdit);
	const isModalOpen = useSelector((state) => state.ui.form.investmentTransaction.isModalOpen);

	const { name } = useParams();
	const { pathname } = useLocation();
	const accountId = useMemo(() => getAccountId(pathname), [pathname]);
	const accountTransactions = useMemo(() => getAccountTransactions(allAccountsTransactions, accountId), [allAccountsTransactions, accountId]);

	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(setAccountAction(name));
		dispatch(getAccountInvestmentsAction(accountId));
	}, [accountId, name]);
	
	const onNewClick = () => {
		dispatch(openTransactionInModal());
	};

	return (
		<React.Fragment>
			<TitleHeader title={account} />
			<Container>
				<Paper
					sx={(theme) => ({
						[theme.breakpoints.up('lg')]: {
							marginTop: theme.spacing(2)
						},
						[theme.breakpoints.down('sm')]: {
							marginTop: 0
						},
						alignItems: 'center'
					})}
				>
					<Sticky>
						<div style={{ display: 'inline-block', width: '50%' }}>
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
						</div>
						<div style={{ display: 'inline-block', width: '50%' }}>
							<Link to={`/Bank/${account}_Cash`} style={linkStyle}>
								<Button
									fullWidth
									variant="outlined"
									color="primary"
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
					</Sticky>
					<InvestmentTransactions
						transactions={accountTransactions}
					/>

					<InvestmentTransactionModal
						EditForm={InvestmentTransactionForm}
						isOpen={isModalOpen}
						isEdit={isEdit}
						account={account}
						accountId={accountId}
						transactions={accountTransactions}
						autocompleteInvestmentList={dropInvestmentList}
					/>
					<AccountInvestments />
				</Paper>
			</Container>
		</React.Fragment>
	);
}

export default Investment;
