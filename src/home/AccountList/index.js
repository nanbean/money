import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';
import _ from 'lodash';

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

export class AccountList extends Component {
	shouldComponentUpdate (nextProps) {
		const prevAccountList = this.props.accountList.map(i => ({ type: i.type, name: i.name, balance: i.balance }));
		const nextAccountList = nextProps.accountList.map(i => ({ type: i.type, name: i.name, balance: i.balance }));

		if (_.isEqual(prevAccountList, nextAccountList)) {
			return false;
		}

		return true;
	}

	render () {
		const { accountList, classes } = this.props;
		const filteredAccountList = accountList.filter(i => i.closed === false && !i.name.match(/_Cash/i));

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
					{filteredAccountList && filteredAccountList.map(row => (
						<TableRow key={row.name}>
							<TableCell component="th" scope="row" align="center" className={classes.cell}>
								<span>
									{`${typeEmoji[row.type]} ${row.type}`}
								</span>
							</TableCell>
							<TableCell align="center" className={classes.cell}>
								<span>
									<Link to={`/${row.type}/${row.name}`} className={classes.link}>{row.name}</Link>
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
