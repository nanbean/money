import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';
import Typography from '@material-ui/core/Typography';

import MortgageSchedule from '../components/MortgageSchedule';
import TitleHeader from '../components/TitleHeader';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';
import BankTransactionForm from '../components/BankTransactionForm';

import { getMortgageScheduleAction } from '../actions/mortgageActions';
import { getCategoryListAction } from '../actions/categoryActions';
import { getPayeeListAction } from '../actions/payeeActions';
import {
	getTransactionsAction,
	addTransactionAction,
	deleteTransactionAction,
	editTransactionAction
} from '../actions/transactionActions';
import {
	openTransactionInModal,
	resetTransactionForm
} from '../actions/ui/form/bankTransaction';
import { toCurrencyFormat } from '../utils/formatting';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing.unit * 3,
		[theme.breakpoints.down('sm')]: {
			padding: 0
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
	rightIcon: {
		marginLeft: theme.spacing.unit
	},
	total: {
		marginTop: theme.spacing.unit,
		marginRight: theme.spacing.unit
	}
});

class Bank extends Component {
	componentDidMount () {
		const { match } = this.props;
		const name = match && match.params && match.params.name;

		this.props.getTransactionsAction(name);
		this.props.getCategoryListAction();
		this.props.getPayeeListAction();
	}

	render () {
		const {
			account,
			classes,
			transactions,
			categoryList,
			payeeList,
			mortgageSchedule
		} = this.props;
		const balance = transactions.length > 0 && transactions.map((i) => i.amount).reduce( (a, b) => a + b );
		const dropCategoryList = categoryList.map(i => ({ key: i, value: i, text: i }));
		const dropPayeeList = payeeList.map(i => ({ key: i, name: i }));

		return (
			<div>
				<TitleHeader title={account} />
				<div className={classes.container}>
					<Paper className={classes.paper}>
						<div className={classes.sticky}>
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
						<BankTransactions
							account={account}
							transactions={transactions}
							openTransactionInModal={this.props.openTransactionInModal}
						/>
						<Typography variant="h6" color="inherit" gutterBottom align="right" className={classes.total}>
							잔액 : {toCurrencyFormat(balance)}
						</Typography>
						<BankTransactionModal
							EditForm={BankTransactionForm}
							isOpen={this.props.isModalOpen}
							isEdit={this.props.isEdit}
							account={account}
							transactions={transactions}
							dropCategoryList={dropCategoryList}
							dropPayeeList={dropPayeeList}
							resetTransactionForm={this.props.resetTransactionForm}
							addTransactionAction={this.props.addTransactionAction}
							deleteTransactionAction={this.props.deleteTransactionAction}
							editTransactionAction={this.props.editTransactionAction}
						/>
						{
							account === '아낌이모기지론' &&
							<MortgageSchedule
								mortgageSchedule={mortgageSchedule}
								getMortgageScheduleAction={this.props.getMortgageScheduleAction}
								addTransactionAction={this.props.addTransactionAction}
							/>
						}
					</Paper>
				</div>
			</div>
		);
	}
}

Bank.propTypes = {
	account: PropTypes.string.isRequired,
	addTransactionAction: PropTypes.func.isRequired,
	categoryList: PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
	deleteTransactionAction: PropTypes.func.isRequired,
	editTransactionAction: PropTypes.func.isRequired,
	getCategoryListAction: PropTypes.func.isRequired,
	getMortgageScheduleAction: PropTypes.func.isRequired,
	getPayeeListAction: PropTypes.func.isRequired,
	getTransactionsAction: PropTypes.func.isRequired,
	isEdit: PropTypes.bool.isRequired,
	isModalOpen: PropTypes.bool.isRequired,
	mortgageSchedule: PropTypes.array.isRequired,
	openTransactionInModal: PropTypes.func.isRequired,
	payeeList: PropTypes.array.isRequired,
	resetTransactionForm: PropTypes.func.isRequired,
	transactions: PropTypes.array.isRequired,
	match: PropTypes.shape({
		params: PropTypes.shape({
			name: PropTypes.string.isRequired
		}).isRequired
	})
};

const mapStateToProps = state => ({
	account: state.account,
	categoryList: state.categoryList,
	payeeList: state.payeeList,
	transactions: state.transactions,
	mortgageSchedule: state.mortgageSchedule,
	isModalOpen: state.ui.form.bankTransaction.isModalOpen,
	isEdit: state.ui.form.bankTransaction.isEdit
});

const mapDispatchToProps = dispatch => ({
	getCategoryListAction () {
		dispatch(getCategoryListAction());
	},
	getPayeeListAction () {
		dispatch(getPayeeListAction());
	},
	getTransactionsAction (params) {
		dispatch(getTransactionsAction(params));
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
	openTransactionInModal (params) {
		dispatch(openTransactionInModal(params));
	},
	resetTransactionForm () {
		dispatch(resetTransactionForm());
	},
	getMortgageScheduleAction () {
		dispatch(getMortgageScheduleAction());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(Bank));
