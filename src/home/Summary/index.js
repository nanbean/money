import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

import Amount from '../../components/Amount';

const quickAssetAccount = [
	'키움증권맥쿼리',
	'키움증권',
	'몬쁭스SK증권',
	'동양종금장마',
	'급여계좌',
	'KB체크카드',
	'KB카드',
	'LG카드',
	'생활비카드',
	'지갑',
	'연금저축',
	'IRP',
	'IRP오은미'
];

const styles = theme => ({
	table: {
		
	},
	cell: {
		[theme.breakpoints.down('sm')]: {
			padding: 0
			// width: '33%'
		},
		fontSize: '0.9em'
	}
});

export class Summary extends Component {
	render () {
		const { accountList, classes } = this.props;
		let sum = 0;
		let financeSum = 0;
		let quickassets = 0;

		if (accountList.length > 0) {
			sum = accountList.map((i) => i.balance).reduce( (prev, curr) => prev + curr );
			financeSum = accountList.filter(i => i.type !== 'Oth A')
				.map((i) => i.balance)
				.reduce( (prev, curr) => prev + curr );
			quickassets = accountList.filter(i => quickAssetAccount.find(j => j === i.name))
				.map((i) => i.balance)
				.reduce( (prev, curr) => prev + curr );
		}

		return (
			<Table className={classes.table}>
				<TableBody>
					<TableRow>
						<TableCell align="center" className={classes.cell}><Amount value={sum} /></TableCell>
						<TableCell align="center" className={classes.cell}><Amount value={quickassets} /></TableCell>
						<TableCell align="center" className={classes.cell}><Amount value={financeSum} /></TableCell>
					</TableRow>
				</TableBody>
			</Table>
		);
	}
}

Summary.propTypes = {
	accountList:  PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
	accountList: state.accountList
});

export default connect(
	mapStateToProps
)(withStyles(styles)(Summary));