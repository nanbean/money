import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import LinearProgress from '@material-ui/core/LinearProgress';

import Button from '@material-ui/core/Button';
import RefreshIcon from '@material-ui/icons/Refresh';
import Typography from '@material-ui/core/Typography';
import MuiExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import Summary from '../Summary';
import LatestTransactions from '../LatestTransactions';
import AccountList from '../AccountList';
import WeeklyGraph from '../WeeklyGraph';

import TitleHeader from '../../components/TitleHeader';

import { getAccountListAction } from '../../actions/accountActions';
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
		backgroundColor: 'white'
	},
	rightIcon: {
		marginLeft: theme.spacing.unit
	},
	expansionWrapper: {
		display: 'flex',
		flexFlow: 'row wrap'
	},
	summaryPanel: {
		flex: '1 1 auto',
		minWidth: 500,
		[theme.breakpoints.down('sm')]: {
			minWidth: 360
		}
	},
	weeklyGraphPanel: {
		flex: '1 1 auto',
		minWidth: 500,
		[theme.breakpoints.down('sm')]: {
			minWidth: 360
		}
	},
	latestTransactionPanel: {
		flex: '1 1 auto',
		minWidth: 500,
		[theme.breakpoints.down('sm')]: {
			minWidth: 360
		}
	},
	accountPanel: {
		flex: '1 1 auto',
		minWidth: 500,
		[theme.breakpoints.down('sm')]: {
			minWidth: 360
		}
	},
	expansionSummary: {

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

const ExpansionPanel = withStyles({
	root: {
		border: '1px solid rgba(0,0,0,.125)',
		boxShadow: 'none',
		'&:not(:last-child)': {
			borderBottom: 0
		},
		'&:before': {
			display: 'none'
		}
	},
	expanded: {
		margin: 0
	}
})(MuiExpansionPanel);

export class HomeMain extends Component {
	state = {
		latestTransactionsExpanded: true,
		accountsExpanded: true
	};

	componentDidMount () {
		this.props.getAccountListAction();
	}

	onAccountsExpansionPanelChangeHalder = (event, expanded) => {
		this.props.changeAccountsExpanded(expanded);
	}

	onLatestTransactionsExpansionPanelChangeHalder = (event, expanded) => {
		this.props.changeLatestTransactionsExpanded(expanded);
	}

	onSummaryExpansionPanelChangeHalder = (event, expanded) => {
		this.props.changeSummaryExpanded(expanded);
	}
	
	onWeeklyGraphExpansionPanelChangeHalder = (event, expanded) => {
		this.props.changeWeeklyGraphExpanded(expanded);
	}

	onRefreshClick = () => {
		this.props.updateInvestmentPriceAction();
	}

	render () {
		const {
			accountsExpanded,
			classes,
			latestTransactionsExpanded,
			summaryExpanded,
			updateInvestmentPriceFetching,
			weeklyGraphExpanded
		} = this.props;

		return (
			<React.Fragment>
				<TitleHeader title="Home" />
				{
					updateInvestmentPriceFetching &&
					<LinearProgress color="secondary" className={classes.progress} />
				}
				<div className={classes.container}>
					<div className={classes.sticky}>
						<Button
							fullWidth
							variant="outlined"
							color="primary"
							onClick={this.onRefreshClick}
						>
								Refresh
							<RefreshIcon className={classes.rightIcon} />
						</Button>
					</div>

					<div className={classes.expansionWrapper}>
						<div className={classes.summaryPanel}>
							<ExpansionPanel
								expanded={summaryExpanded}
								onChange={this.onSummaryExpansionPanelChangeHalder}
							>
								<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} className={classes.expansionSummary}>
									<Typography variant="subtitle1">
									Summary
									</Typography>
								</ExpansionPanelSummary>
								<ExpansionPanelDetails className={classes.expansionDetails}>
									<Summary />
								</ExpansionPanelDetails>
							</ExpansionPanel>
						</div>
						<div className={classes.weeklyGraphPanel}>
							<ExpansionPanel
								expanded={weeklyGraphExpanded}
								onChange={this.onWeeklyGraphExpansionPanelChangeHalder}
							>
								<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
									<Typography variant="subtitle1">
									Weekly Graph
									</Typography>
								</ExpansionPanelSummary>
								<ExpansionPanelDetails className={classes.expansionDetails}>
									<WeeklyGraph />
								</ExpansionPanelDetails>
							</ExpansionPanel>
						</div>
						<div className={classes.latestTransactionPanel}>
							<ExpansionPanel
								expanded={latestTransactionsExpanded}
								onChange={this.onLatestTransactionsExpansionPanelChangeHalder}
							>
								<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
									<Typography variant="subtitle1">
									Latest Transactions
									</Typography>
								</ExpansionPanelSummary>
								<ExpansionPanelDetails className={classes.expansionDetails}>
									<LatestTransactions />
								</ExpansionPanelDetails>
							</ExpansionPanel>
						</div>
						<div className={classes.accountPanel}>
							<ExpansionPanel
								expanded={accountsExpanded}
								onChange={this.onAccountsExpansionPanelChangeHalder}
							>
								<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
									<Typography variant="subtitle1">
										Accounts
									</Typography>
								</ExpansionPanelSummary>
								<ExpansionPanelDetails className={classes.expansionDetails}>
									<AccountList />
								</ExpansionPanelDetails>
							</ExpansionPanel>
						</div>
					</div>					
				</div>
			</React.Fragment>
		);
	}
}

HomeMain.propTypes = {
	accountList:  PropTypes.array.isRequired,
	accountsExpanded: PropTypes.bool.isRequired,
	changeAccountsExpanded: PropTypes.func.isRequired,
	changeLatestTransactionsExpanded: PropTypes.func.isRequired,
	changeSummaryExpanded: PropTypes.func.isRequired,
	changeWeeklyGraphExpanded: PropTypes.func.isRequired,
	classes: PropTypes.object.isRequired,
	getAccountListAction: PropTypes.func.isRequired,
	latestTransactionsExpanded: PropTypes.bool.isRequired,
	summaryExpanded: PropTypes.bool.isRequired,
	updateInvestmentPriceAction: PropTypes.func.isRequired,
	updateInvestmentPriceFetching: PropTypes.bool.isRequired,
	weeklyGraphExpanded: PropTypes.bool.isRequired
};

const mapStateToProps = state => ({
	accountList: state.accountList,
	accountsExpanded: state.ui.home.accountsExpanded,
	latestTransactionsExpanded: state.ui.home.latestTransactionsExpanded,
	summaryExpanded: state.ui.home.summaryExpanded,
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
		getAccountListAction,
		updateInvestmentPriceAction
	}
)(withStyles(styles)(HomeMain));
