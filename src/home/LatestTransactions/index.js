import React from 'react';
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
import Payee from '../../common/Payee';

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

export function LastTransactions({
	classes,
	latestTransactions,
	openTransactionInModal
}) {
	const onRowSelect = (index) => () => {
		const transaction = latestTransactions[index];

		openTransactionInModal({
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
					{latestTransactions && latestTransactions.map((row, index) => (
						<TableRow key={index} onClick={onRowSelect(index)}>
							<TableCell component="th" scope="row" align="center" className={classes.cell}>
								<span>
									{`${typeEmoji[row.type]} ${row.account}`}
								</span>
							</TableCell>
							<TableCell align="center" className={classes.cell}>
								<span>
									{moment(row.date).format('MM-DD')}
								</span>
							</TableCell>
							<TableCell align="center" className={classes.cell}>
								<Payee category={row.category} value={row.payee} />
							</TableCell>
							<TableCell align="center" className={classes.cell}><Amount value={row.amount} /></TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<BankTransactionModal
				isEdit={true}
				transactions={latestTransactions}
			/>
		</React.Fragment>
	);
}

LastTransactions.propTypes = {
	classes: PropTypes.object.isRequired,
	deleteFetching: PropTypes.bool.isRequired,
	deleteStatus: PropTypes.string.isRequired,
	editFetching: PropTypes.bool.isRequired,
	editStatus: PropTypes.string.isRequired,
	latestTransactions:  PropTypes.array.isRequired,
	openTransactionInModal: PropTypes.func.isRequired
};

const mapStateToProps = (state) => ({
	deleteFetching: state.deleteTransaction.fetching,
	deleteStatus: state.deleteTransaction.status,
	editFetching: state.editTransaction.fetching,
	editStatus: state.editTransaction.status,
	latestTransactions: state.latestTransactions
});

const mapDispatchToProps = dispatch => ({
	openTransactionInModal (params) {
		dispatch(openTransactionInModal(params));
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(LastTransactions));
