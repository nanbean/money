import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import LinearProgress from '@material-ui/core/LinearProgress';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import RefreshIcon from '@material-ui/icons/Refresh';
import Typography from '@material-ui/core/Typography';

import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import Summary from '../Summary';
import LatestTransactions from '../LatestTransactions';
import AccountList from '../AccountList';
import WeeklyGraph from '../WeeklyGraph';

import TitleHeader from '../../components/TitleHeader';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';

import {
	getWeeklyTransactionsAction
} from '../../actions/couchdbActions';
import { updateInvestmentPriceAction } from '../../actions/priceActions';

import {
	changeAccountsExpanded,
	changeLatestTransactionsExpanded,
	changeSummaryExpanded,
	changeWeeklyGraphExpanded
} from '../../actions/ui/homeActions';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing.unit * 3,
		[theme.breakpoints.down('sm')]: {
			padding: 0
		}
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
		[theme.breakpoints.up('md')]: {
			marginBottom: 10
		},
		backgroundColor: 'white'
	},
	rightIcon: {
		marginLeft: theme.spacing.unit
	},
	expansionDetails: {
		padding: 0
	},
	progress: {
		zIndex: theme.zIndex.drawer + 2,
		position: 'sticky',
		top: 64,
		[theme.breakpoints.down('sm')]: {
			top: 56
		}
	}
});

export function HomeMain({
	accountList,
	accountsExpanded,
	classes,
	latestTransactionsExpanded,
	summaryExpanded,
	trascationsFetching,
	updateInvestmentPriceFetching,
	weeklyGraphExpanded,
	changeAccountsExpanded,
	changeLatestTransactionsExpanded,
	changeSummaryExpanded,
	changeWeeklyGraphExpanded,
	getWeeklyTransactionsAction,
	updateInvestmentPriceAction
}) {
	useEffect(() => {
		getWeeklyTransactionsAction();
  }, []);

	const onAccountsExpansionPanelChangeHalder = (event, expanded) => {
		changeAccountsExpanded(expanded);
	}

	const onLatestTransactionsExpansionPanelChangeHalder = (event, expanded) => {
		changeLatestTransactionsExpanded(expanded);
	}

	const onSummaryExpansionPanelChangeHalder = (event, expanded) => {
		changeSummaryExpanded(expanded);
	}
	
	const onWeeklyGraphExpansionPanelChangeHalder = (event, expanded) => {
		changeWeeklyGraphExpanded(expanded);
	}

	const onRefreshClick = () => {
		updateInvestmentPriceAction();
	}

	return (
		<React.Fragment>
			<TitleHeader title="Home" />
			{
				(updateInvestmentPriceFetching || trascationsFetching) &&
				<LinearProgress color="secondary" className={classes.progress} />
			}
			<div className={classes.container}>
				<div className={classes.sticky}>
					<Button
						fullWidth
						variant="outlined"
						color="primary"
						onClick={onRefreshClick}
					>
							Refresh
						<RefreshIcon className={classes.rightIcon} />
					</Button>
				</div>
				<Grid container>
					<Grid item xl={6} md={6} lg={4} sm={12} xs={12}>
						<ExpansionPanel
							expanded={summaryExpanded}
							onChange={onSummaryExpansionPanelChangeHalder}
						>
							<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
								<Typography variant="subtitle1">
								Summary
								</Typography>
							</ExpansionPanelSummary>
							<ExpansionPanelDetails className={classes.expansionDetails}>
								<Summary />
							</ExpansionPanelDetails>
						</ExpansionPanel>
					</Grid>
					<Grid item xl={6} md={6} lg={4} sm={12} xs={12}>
						<ExpansionPanel
							expanded={weeklyGraphExpanded}
							onChange={onWeeklyGraphExpansionPanelChangeHalder}
						>
							<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
								<Typography variant="subtitle1">
								Weekly Graph
								</Typography>
							</ExpansionPanelSummary>
							<ExpansionPanelDetails className={classes.expansionDetails}>
								<WeeklyGraph/>
							</ExpansionPanelDetails>
						</ExpansionPanel>
					</Grid>
					<Grid item xl={6} md={6} lg={4} sm={12} xs={12}>
						<ExpansionPanel
							expanded={latestTransactionsExpanded}
							onChange={onLatestTransactionsExpansionPanelChangeHalder}
						>
							<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
								<Typography variant="subtitle1">
								Latest Transactions
								</Typography>
							</ExpansionPanelSummary>
							<ExpansionPanelDetails className={classes.expansionDetails}>
								<LatestTransactions/>
							</ExpansionPanelDetails>
						</ExpansionPanel>
					</Grid>
					<Grid item xl={6} md={6} lg={4} sm={12} xs={12}>
						<AccountList
							accountList={accountList}
							accountsExpanded={accountsExpanded}
							onAccountsExpansionPanelChangeHalder={onAccountsExpansionPanelChangeHalder}
						/>
					</Grid>
				</Grid>
			</div>
		</React.Fragment>
	);
}

HomeMain.propTypes = {
	accountList:  PropTypes.array.isRequired,
	accountsExpanded: PropTypes.bool.isRequired,
	changeAccountsExpanded: PropTypes.func.isRequired,
	changeLatestTransactionsExpanded: PropTypes.func.isRequired,
	changeSummaryExpanded: PropTypes.func.isRequired,
	changeWeeklyGraphExpanded: PropTypes.func.isRequired,
	classes: PropTypes.object.isRequired,
	getWeeklyTransactionsAction: PropTypes.func.isRequired,
	latestTransactionsExpanded: PropTypes.bool.isRequired,
	summaryExpanded: PropTypes.bool.isRequired,
	trascationsFetching: PropTypes.bool.isRequired,
	updateInvestmentPriceAction: PropTypes.func.isRequired,
	updateInvestmentPriceFetching: PropTypes.bool.isRequired,
	weeklyGraphExpanded: PropTypes.bool.isRequired
};

const mapStateToProps = state => ({
	accountList: state.accountList,
	accountsExpanded: state.ui.home.accountsExpanded,
	latestTransactionsExpanded: state.ui.home.latestTransactionsExpanded,
	summaryExpanded: state.ui.home.summaryExpanded,
	trascationsFetching: state.trascationsFetching,
	updateInvestmentPriceFetching: state.updateInvestmentPriceFetching,
	weeklyGraphExpanded: state.ui.home.weeklyGraphExpanded
});

export default connect(
	mapStateToProps,
	{
		changeAccountsExpanded,
		changeLatestTransactionsExpanded,
		changeSummaryExpanded,
		changeWeeklyGraphExpanded,
		updateInvestmentPriceAction,
		getWeeklyTransactionsAction
	}
)(withStyles(styles)(HomeMain));
