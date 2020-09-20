import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import TableCell from '../../components/TableCell';

import Amount from '../../components/Amount';

import { TYPE_EMOJI } from '../../constants';

const styles = () => ({
	link: {
		textDecoration: 'none',
		color: 'inherit'
	}
});

const filterAccountList = accountList => accountList.filter(i => i.closed === false && !i.name.match(/_Cash/i));

export function AccountList ({
	accountList,
	classes
}) {
	const filteredAccountList = useMemo(() => filterAccountList(accountList), [accountList]);

	return (
		<Table className={classes.table}>
			<TableHead>
				<TableRow>
					<TableCell align="center">Type</TableCell>
					<TableCell align="center">Account</TableCell>
					<TableCell align="center">Amount</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				{filteredAccountList && filteredAccountList.map(row => (
					<TableRow key={row.name}>
						<TableCell component="th" scope="row" align="center">
							<span>
								{`${TYPE_EMOJI[row.type]} ${row.type}`}
							</span>
						</TableCell>
						<TableCell align="center">
							<span>
								<Link to={`/${row.type}/${row.name}`} className={classes.link}>{row.name}</Link>
							</span>
						</TableCell>
						<TableCell align="center"><Amount value={row.balance} /></TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

AccountList.propTypes = {
	accountList:  PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired
};

const mapStateToProps = (state) => ({
	accountList: state.accountList
});

export default connect(
	mapStateToProps
)(withStyles(styles)(AccountList));
