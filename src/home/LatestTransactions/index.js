import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import moment from 'moment';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import TableCell from '../../components/TableCell';

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

const styles = () => ({
	row: {
		'&:hover': {
			cursor: 'pointer'
		}
	},
	link: {
		textDecoration: 'none',
		color: 'inherit'
	}
});

export function LastTransactions ({
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
	};

	return (
		<React.Fragment>
			<Table>
				<TableHead>
					<TableRow>
						<TableCell align="center">Account</TableCell>
						<TableCell align="center">Date</TableCell>
						<TableCell align="center">Payee</TableCell>
						<TableCell align="center">Amount</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{latestTransactions && latestTransactions.map((row, index) => (
						<TableRow key={index} className={classes.row} onClick={onRowSelect(index)}>
							<TableCell component="th" scope="row" align="center">
								<span>
									{`${typeEmoji[row.type]} ${row.account}`}
								</span>
							</TableCell>
							<TableCell align="center">
								<span>
									{moment(row.date).format('MM-DD')}
								</span>
							</TableCell>
							<TableCell align="center">
								<Payee category={row.category} value={row.payee} />
							</TableCell>
							<TableCell align="center"><Amount value={row.amount} /></TableCell>
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
	latestTransactions:  PropTypes.array.isRequired,
	openTransactionInModal: PropTypes.func.isRequired
};

const mapStateToProps = (state) => ({
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
