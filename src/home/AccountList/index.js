import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';

import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import ExpansionPanel from '../../components/ExpansionPanel';
import ExpansionPanelSummary from '../../components/ExpansionPanelSummary';
import ExpansionPanelDetails from '../../components/ExpansionPanelDetails';

import Amount from '../../components/Amount';

import { TYPE_EMOJI } from '../../constants';

const styles = theme => ({
	accountPanel: {
		flex: '1 1 auto',
		minWidth: 500,
		[theme.breakpoints.down('sm')]: {
			minWidth: 360
		}
	},
	table: {
		
	},
	cell: {

	},
	link: {
		textDecoration: 'none',
		color: 'inherit'
	}
});

export function AccountList ({
	accountsExpanded,
	accountList,
	classes,
	onAccountsExpansionPanelChangeHalder
}) {
	const filterAccountList = () => accountList.filter(i => i.closed === false && !i.name.match(/_Cash/i));
	const filteredAccountList = useMemo(() => filterAccountList());

	return (
		<div className={classes.accountPanel}>
			<ExpansionPanel
				expanded={accountsExpanded}
				onChange={onAccountsExpansionPanelChangeHalder}
			>
				<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
					<Typography variant="subtitle1">
						Accounts
					</Typography>
				</ExpansionPanelSummary>
				<ExpansionPanelDetails className={classes.expansionDetails}>
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
											{`${TYPE_EMOJI[row.type]} ${row.type}`}
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
				</ExpansionPanelDetails>
			</ExpansionPanel>
		</div>
	);
}

AccountList.propTypes = {
	accountList:  PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired
};

export default withStyles(styles)(AccountList);
