import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import Amount from '../../components/Amount';

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
			width: '33%'
		},
		fontSize: '0.9em'
	},
	link: {
		textDecoration: 'none',
		color: 'inherit'
	}
});

export class AccountList extends Component {
	render () {
		const { accountList, classes } = this.props;

		return (
			<Table className={classes.table}>
				<TableHead>
					<TableRow>
						<TableCell align="center" className={classes.cell}>Type</TableCell>
						<TableCell align="center" className={classes.cell}>Account</TableCell>
						<TableCell align="center" className={classes.cell}>Amount</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{accountList && accountList.map(row => (
						<TableRow key={row.name}>
							<TableCell component="th" scope="row" align="center" className={classes.cell}>
								<span>
									{`${typeEmoji[row.type]} ${row.type}`}
								</span>
							</TableCell>
							<TableCell align="center" className={classes.cell}>
								<span>
									{
										(row.type === 'Bank' || row.type === 'CCard' || row.type === 'Oth L' || row.type === 'Oth A' || row.type === 'Cash') &&
										<Link to={`/bank/${row.name}`} className={classes.link}>{row.name}</Link>
									}
									{
										row.type === 'Invst' &&
										<Link to={`/investment/${row.name}`} className={classes.link}>{row.name}</Link>
									}
								</span>
							</TableCell>
							<TableCell align="center" className={classes.cell}><Amount value={row.balance} /></TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	}
}

AccountList.propTypes = {
	accountList:  PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
	accountList: state.accountList
});

export default connect(
	mapStateToProps,
	null
)(withStyles(styles)(AccountList));
