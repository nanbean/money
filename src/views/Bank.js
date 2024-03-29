import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useLocation } from 'react-router-dom';

import { styled } from '@mui/material/styles';

import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import AddIcon from '@mui/icons-material/Add';

import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';
import BankTransactionForm from '../components/BankTransactionForm';

import { setAccountAction } from '../actions/accountActions';
import { openTransactionInModal } from '../actions/ui/form/bankTransaction';

import { toCurrencyFormat } from '../utils/formatting';

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

export function Bank () {
	const account = useSelector((state) => state.account);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const dropCategoryList = useSelector((state) => state.dropCategoryList);
	const dropPayeeList = useSelector((state) => state.dropPayeeList);
	const isModalOpen = useSelector((state) => state.ui.form.bankTransaction.isModalOpen,);
	const isEdit = useSelector((state) => state.ui.form.bankTransaction.isEdit);

	let { name } = useParams();
	let { pathname } = useLocation();
	const accountId = useMemo(() => getAccountId(pathname), [pathname]);
	const accountTransactions = useMemo(() => getAccountTransactions(allAccountsTransactions, accountId), [allAccountsTransactions, accountId]);
	const balance = accountTransactions.length > 0 && accountTransactions.map((i) => i.amount).reduce( (a, b) => a + b );

	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(setAccountAction(name));
	}, []);

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
					<BankTransactions
						account={account}
						transactions={accountTransactions}
					/>
					<Typography
						variant="h6"
						color="inherit"
						gutterBottom
						align="right"
						sx={(theme) => ({
							marginTop: theme.spacing(1),
							marginRight: theme.spacing(1)
						})}
					>
						잔액 : {toCurrencyFormat(balance)}
					</Typography>
					<BankTransactionModal
						EditForm={BankTransactionForm}
						isOpen={isModalOpen}
						isEdit={isEdit}
						accountId={accountId}
						account={account}
						transactions={accountTransactions}
						dropCategoryList={dropCategoryList}
						dropPayeeList={dropPayeeList}
					/>
				</Paper>
			</Container>
		</React.Fragment>
	);
}

export default Bank;
