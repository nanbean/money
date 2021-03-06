import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';

import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';
import MoneyIcon from '@material-ui/icons/Money';

import AccountInvestments from './AccountInvestments';
import TitleHeader from '../components/TitleHeader';
import InvestmentTransactions from '../components/InvestmentTransactions';
import InvestmentTransactionModal from '../components/InvestmentTransactionModal';
import InvestmentTransactionForm from '../components/InvestmentTransactionForm';

import { setAccountAction } from '../actions/accountActions';

import {
	getAccountInvestmentsAction,
	addTransactionAction,
	editTransactionAction,
	deleteTransactionAction
} from '../actions/couchdbActions';
import {
	openTransactionInModal,
	resetTransactionForm
} from '../actions/ui/form/investmentTransaction';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing(3),
		[theme.breakpoints.down('sm')]: {
			padding: 0
		}
	},
	paper: {
		[theme.breakpoints.up('lg')]: {
			marginTop: theme.spacing(2)
		},
		[theme.breakpoints.down('sm')]: {
			marginTop: 0
		},
		alignItems: 'center'
	},
	sticky: {
		width: '100%',
		position: 'sticky',
		zIndex: theme.zIndex.drawer + 1,
		[theme.breakpoints.down('sm')]: {
			top: 56
		},
		[theme.breakpoints.up('sm')]: {
			top: 64
		},
		backgroundColor: 'white'
	},
	headerHalf: {
		display: 'inline-block',
		width: '50%'
	},
	rightIcon: {
		marginLeft: theme.spacing(1)
	},
	link: {
		textDecoration: 'none',
		color: 'inherit'
	}
});

const getAccountId = url => `account${url.replace(/\//g, ':')}`;
const getAccountTransactions = (transactions, accountId) => transactions.filter(i => i.accountId === accountId);

export function Investment ({
	account,
	addTransactionAction,
	allAccountsTransactions,
	classes,
	deleteTransactionAction,
	dropInvestmentList,
	editTransactionAction,
	getAccountInvestmentsAction,
	isEdit,
	isModalOpen,
	match,
	openTransactionInModal,
	resetTransactionForm,
	setAccountAction
}) {
	const name = match && match.params && match.params.name;
	const url = match.url;
	const accountId = useMemo(() => getAccountId(url), [url]);
	const accountTransactions = useMemo(() => getAccountTransactions(allAccountsTransactions, accountId), [allAccountsTransactions, accountId]);

	useEffect(() => {
		setAccountAction(name);
		getAccountInvestmentsAction( accountId );
	}, [accountId, name]);
	
	return (
		<React.Fragment>
			<TitleHeader title={account} />
			<div className={classes.container}>
				<Paper className={classes.paper}>
					<div className={classes.sticky}>
						<div className={classes.headerHalf}>
							<Button
								fullWidth
								variant="outlined"
								color="primary"
								onClick={openTransactionInModal}
							>
								New
								<AddIcon className={classes.rightIcon} />
							</Button>
						</div>
						<div className={classes.headerHalf}>
							<Link to={`/Bank/${account}_Cash`} className={classes.link}>
								<Button
									fullWidth
									variant="outlined"
									color="primary"
								>
								Cash
									<MoneyIcon className={classes.rightIcon} />
								</Button>
							</Link>
						</div>
					</div>
					<InvestmentTransactions
						openTransactionInModal={openTransactionInModal}
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
						resetTransactionForm={resetTransactionForm}
						addTransactionAction={addTransactionAction}
						deleteTransactionAction={deleteTransactionAction}
						editTransactionAction={editTransactionAction}
					/>
					<AccountInvestments />
				</Paper>
			</div>
		</React.Fragment>
	);
}

Investment.propTypes = {
	account: PropTypes.string.isRequired,
	accountInvestments: PropTypes.array.isRequired,
	addTransactionAction: PropTypes.func.isRequired,
	allAccountsTransactions: PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
	deleteTransactionAction: PropTypes.func.isRequired,
	dropInvestmentList: PropTypes.array.isRequired,
	editTransactionAction: PropTypes.func.isRequired,
	getAccountInvestmentsAction: PropTypes.func.isRequired,
	isEdit: PropTypes.bool.isRequired,
	isModalOpen: PropTypes.bool.isRequired,
	openTransactionInModal: PropTypes.func.isRequired,
	resetTransactionForm: PropTypes.func.isRequired,
	setAccountAction: PropTypes.func.isRequired,
	match: PropTypes.shape({
		params: PropTypes.shape({
			name: PropTypes.string.isRequired
		}).isRequired
	})
};

const mapStateToProps = state => ({
	account: state.account,
	accountInvestments: state.accountInvestments,
	allAccountsTransactions: state.allAccountsTransactions,
	dropInvestmentList: state.dropInvestmentList,
	isModalOpen: state.ui.form.investmentTransaction.isModalOpen,
	isEdit: state.ui.form.investmentTransaction.isEdit
});

const mapDispatchToProps = dispatch => ({
	getAccountInvestmentsAction (params) {
		dispatch(getAccountInvestmentsAction(params));
	},
	addTransactionAction (params) {
		dispatch(addTransactionAction(params));
	},
	deleteTransactionAction (params) {
		dispatch(deleteTransactionAction(params));
	},
	editTransactionAction (params) {
		dispatch(editTransactionAction(params));
	},
	setAccountAction (params) {
		dispatch(setAccountAction(params));
	},
	openTransactionInModal (params) {
		dispatch(openTransactionInModal(params));
	},
	resetTransactionForm () {
		dispatch(resetTransactionForm());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(Investment));
