import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import moment from 'moment';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import Amount from '../../components/Amount';
import BankTransactionModal from '../../components/BankTransactionModal';

import { getlastTransactionsAction } from '../../actions/transactionActions';

import {
	openTransactionInModal
} from '../../actions/ui/form/bankTransaction';

const typeEmoji = {
	'Bank': '🏦',
	'CCard': '💳',
	'Cash': '💵',
	'Invst': '📈',
	'Oth L': '🏧',
	'Oth A': '🏠'
};

const styles = theme => ({
	table: {
		
	},
	cell: {
		[theme.breakpoints.down('sm')]: {
			padding: 0,
			'&:last-child': {
				padding: 0
			}
		},
		fontSize: '0.9em'
	},
	link: {
		textDecoration: 'none',
		color: 'inherit'
	}
});

export class LastTransactions extends Component {
	componentDidMount () {
		this.props.getlastTransactionsAction(moment().subtract(3, 'days').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD'));
	}

	componentDidUpdate (prevProps) {
		if (prevProps.editFetching === true && this.props.editFetching === false && this.props.editStatus === 200) {
			this.props.getlastTransactionsAction(moment().subtract(3, 'days').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD'));
		}
		if (prevProps.deleteFetching === true && this.props.deleteFetching === false && this.props.deleteStatus === 200) {
			this.props.getlastTransactionsAction(moment().subtract(3, 'days').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD'));
		}
	}

	onRowSelect = (index) => () => {
		const {
			lastTransactions
		} = this.props;
		const transaction = lastTransactions[index];

		this.props.openTransactionInModal({
			account: transaction.account,
			date: transaction.date,
			payee: transaction.payee,
			category: transaction.category + (transaction.subcategory ? `:${transaction.subcategory}` : ''),
			amount: transaction.amount,
			memo: transaction.memo,
			isEdit: true,
			index: index
		});
	}
  
	render () {
		const {
			classes,
			lastTransactions
		} = this.props;

		return (
			<React.Fragment>
				<Table className={classes.table}>
					<TableHead>
						<TableRow>
							<TableCell align="center" className={classes.cell}>Account</TableCell>
							<TableCell align="center" className={classes.cell}>Date</TableCell>
							<TableCell align="center" className={classes.cell}>Payee</TableCell>
							<TableCell align="center" className={classes.cell}>Amount</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{lastTransactions && lastTransactions.map((row, index) => (
							<TableRow key={index} onClick={this.onRowSelect(index)}>
								<TableCell component="th" scope="row" align="center" className={classes.cell}>
									<span>
										{`${typeEmoji[row.type]} ${row.account}`}
									</span>
								</TableCell>
								<TableCell align="center" className={classes.cell}>
									<span>
										{row.date}
									</span>
								</TableCell>
								<TableCell align="center" className={classes.cell}>{row.payee}</TableCell>
								<TableCell align="center" className={classes.cell}><Amount value={row.amount} /></TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				<BankTransactionModal
					isEdit={true}
					transactions={lastTransactions}
				/>
			</React.Fragment>
		);
	}
}

LastTransactions.propTypes = {
	classes: PropTypes.object.isRequired,
	deleteFetching: PropTypes.bool.isRequired,
	deleteStatus: PropTypes.string.isRequired,
	editFetching: PropTypes.bool.isRequired,
	editStatus: PropTypes.string.isRequired,
	getlastTransactionsAction: PropTypes.func.isRequired,
	lastTransactions:  PropTypes.array.isRequired,
	openTransactionInModal: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
	deleteFetching: state.deleteTransaction.fetching,
	deleteStatus: state.deleteTransaction.status,
	editFetching: state.editTransaction.fetching,
	editStatus: state.editTransaction.status,
	lastTransactions: state.lastTransactions
});

const mapDispatchToProps = dispatch => ({
	getlastTransactionsAction (start, end) {
		dispatch(getlastTransactionsAction(start, end));
	},
	openTransactionInModal (params) {
		dispatch(openTransactionInModal(params));
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(LastTransactions));
