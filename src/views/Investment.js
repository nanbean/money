import React, { Component } from 'react';
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

import { setAccount } from '../actions/accountActions';
import {
	getInvestmentListAction,
	getAllInvestmentsTransactionsAction,
	getAllInvestmentsPriceAction,
	getInvestmentAccountTransactionsAction,
	getAccountInvestmentsAction,
	addInvestmentTransactionAction,
	deleteInvestmentTransactionAction,
	editInvestmentTransactionAction
} from '../actions/investmentActions';
import {
	openTransactionInModal,
	resetTransactionForm
} from '../actions/ui/form/investmentTransaction';

const styles = theme => ({
	container: {
		maxWidth: 1200,
		[theme.breakpoints.up('lg')]: {
			margin: '1em auto'
		},
		[theme.breakpoints.down('sm')]: {
			margin: 0
		}
	},
	paper: {
		[theme.breakpoints.up('lg')]: {
			marginTop: theme.spacing.unit * 2
		},
		[theme.breakpoints.down('sm')]: {
			marginTop: 0
		},
		alignItems: 'center'
	},
	header: {
		width: '100%',
		position: 'sticky',
		zIndex: theme.zIndex.drawer + 1,
		[theme.breakpoints.down('sm')]: {
			top: 56
		},
		[theme.breakpoints.up('sm')]: {
			top: 64
		},
		backgroundColor: '#ffffff'
	},
	headerHalf: {
		display: 'inline-block',
		width: '50%'
	},
	rightIcon: {
		marginLeft: theme.spacing.unit
	},
	link: {
		textDecoration: 'none',
		color: 'inherit'
	}
});

export class Investment extends Component {
	componentDidMount () {
		const { match } = this.props;
		const name = match && match.params && match.params.name;

		this.props.setAccount(name);
		this.props.getAllInvestmentsTransactionsAction();
		this.props.getAllInvestmentsPriceAction();
		this.props.getInvestmentAccountTransactionsAction(name);
		this.props.getInvestmentListAction();
		this.props.getAccountInvestmentsAction(name);
	}

	render () {
		const {
			account,
			classes,
			investmentList, 
			investmentAccountTransactions,
			isMobile 
		} = this.props;
		const autocompleteInvestmentList = investmentList.map(i => ({ key: i.symbol, name: i.name }));

		return (
			<div>
				<TitleHeader title={account} />
				<div className={classes.container}>
					<Paper className={classes.paper}>
						<div className={classes.header}>
							<div className={classes.headerHalf}>
								<Button
									fullWidth
									variant="outlined"
									color="primary"
									onClick={this.props.openTransactionInModal}
								>
								New
									<AddIcon className={classes.rightIcon} />
								</Button>
							</div>
							<div className={classes.headerHalf}>
								<Link to={`/bank/${account}_Cash`} className={classes.link}>
									<Button
										fullWidth
										variant="outlined"
										color="primary"
										onClick={this.props.openTransactionInModal}
									>
									Cash
										<MoneyIcon className={classes.rightIcon} />
									</Button>
								</Link>
							</div>
						</div>
						<InvestmentTransactions
							isMobile={isMobile}
							investmentAccountTransactions={investmentAccountTransactions}
							openTransactionInModal={this.props.openTransactionInModal}
						/>

						<InvestmentTransactionModal
							EditForm={InvestmentTransactionForm}
							isOpen={this.props.isModalOpen}
							isEdit={this.props.isEdit}
							account={account}
							investmentAccountTransactions={investmentAccountTransactions}
							autocompleteInvestmentList={autocompleteInvestmentList}
							resetTransactionForm={this.props.resetTransactionForm}
							addInvestmentTransactionAction={this.props.addInvestmentTransactionAction}
							deleteInvestmentTransactionAction={this.props.deleteInvestmentTransactionAction}
							editInvestmentTransactionAction={this.props.editInvestmentTransactionAction}
						/>
						<AccountInvestments />
					</Paper>
				</div>
			</div>
		);
	}
}

Investment.propTypes = {
	account: PropTypes.string.isRequired,
	accountInvestments: PropTypes.array.isRequired,
	addInvestmentTransactionAction: PropTypes.func.isRequired,
	classes: PropTypes.object.isRequired,
	deleteInvestmentTransactionAction: PropTypes.func.isRequired,
	editInvestmentTransactionAction: PropTypes.func.isRequired,
	getAccountInvestmentsAction: PropTypes.func.isRequired,
	getAllInvestmentsPriceAction: PropTypes.func.isRequired,
	getAllInvestmentsTransactionsAction: PropTypes.func.isRequired,
	getInvestmentAccountTransactionsAction: PropTypes.func.isRequired,
	getInvestmentListAction: PropTypes.func.isRequired,
	investmentAccountTransactions: PropTypes.array.isRequired,
	investmentList: PropTypes.array.isRequired,
	isEdit: PropTypes.bool.isRequired,
	isMobile: PropTypes.bool.isRequired,
	isModalOpen: PropTypes.bool.isRequired,
	openTransactionInModal: PropTypes.func.isRequired,
	resetTransactionForm: PropTypes.func.isRequired,
	setAccount: PropTypes.func.isRequired,
	match: PropTypes.shape({
		params: PropTypes.shape({
			name: PropTypes.string.isRequired
		}).isRequired
	})
};

const mapStateToProps = state => ({
	isMobile: state.ui.isMobile,
	account: state.account,
	accountInvestments: state.accountInvestments,
	investmentList: state.investmentList,
	investmentAccountTransactions: state.investmentAccountTransactions,
	isModalOpen: state.ui.form.investmentTransaction.isModalOpen,
	isEdit: state.ui.form.investmentTransaction.isEdit
});

const mapDispatchToProps = dispatch => ({
	getAllInvestmentsTransactionsAction () {
		dispatch(getAllInvestmentsTransactionsAction());
	},
	getAllInvestmentsPriceAction () {
		dispatch(getAllInvestmentsPriceAction());
	},
	getInvestmentListAction () {
		dispatch(getInvestmentListAction());
	},
	getAccountInvestmentsAction (params) {
		dispatch(getAccountInvestmentsAction(params));
	},
	getInvestmentAccountTransactionsAction (params) {
		dispatch(getInvestmentAccountTransactionsAction(params));
	},
	addInvestmentTransactionAction (params) {
		dispatch(addInvestmentTransactionAction(params));
	},
	deleteInvestmentTransactionAction (params) {
		dispatch(deleteInvestmentTransactionAction(params));
	},
	editInvestmentTransactionAction (params) {
		dispatch(editInvestmentTransactionAction(params));
	},
	setAccount (params) {
		dispatch(setAccount(params));
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
