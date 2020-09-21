import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import Typography from '@material-ui/core/Typography';
import LinearProgress from '@material-ui/core/LinearProgress';

import InvestmentPerformance from '../components/InvestmentPerformance';
import InvestmentFilter from '../components/InvestmentFilter';
import TitleHeader from '../components/TitleHeader';

import {
	setfilteredInvestments
} from '../actions/investmentActions';

import { toCurrencyFormat } from '../utils/formatting';
import { getInvestmentPerformance } from '../utils/performance';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing(3),
		[theme.breakpoints.down('sm')]: {
			padding: 0
		}
	},
	total: {
		marginTop: theme.spacing(1),
		marginRight: theme.spacing(1)
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

export function AllPerformance ({
	allAccountsTransactions,
	allInvestmentsPrice,
	classes,
	filteredInvestments,
	setfilteredInvestments
}) {
	const allInvestmentsTransactions = allAccountsTransactions.filter(i => i.accountId && i.accountId.startsWith('account:Invst'));

	const allPerformance = allInvestmentsTransactions.length > 0 && allInvestmentsPrice.length > 0 && 
		allInvestmentsPrice.filter(i => allInvestmentsTransactions.find(j => j.investment === i.name)).map(i => {
			const investmentTransactions = allInvestmentsTransactions.filter(j => j.investment === i.name);
			const investmentPrice = i.price;
			const performance = getInvestmentPerformance(investmentTransactions, investmentPrice);
			const totalPerformance = performance.length > 0 && performance.map(l => l.periodReturn).reduce((a, b) => a + b);
			const totalQuantity = performance.length > 0 && performance.map(m => m.quantity).reduce((a, b) => a + b);

			return {
				investment: i.name,
				performance: performance,
				totalPerformance: totalPerformance,
				totalQuantity: totalQuantity
			};
		});

	if (allPerformance.length > 0) {
		const filteredPerformance = allPerformance.length > 0 && allPerformance.filter(i => {
			return filteredInvestments.find(j => j === i.investment);
		});
		const grandTotalPerformance = filteredPerformance.length > 0 ? filteredPerformance.map(l => l.totalPerformance).reduce((a, b) => a + b) : 0;

		return (
			<div>
				<TitleHeader title="Performance" />
				<div className={classes.container}>
					<InvestmentFilter
						allInvestmentsPrice={allInvestmentsPrice.filter(i => allInvestmentsTransactions.find(j => j.investment === i.name))}
						filteredInvestments={filteredInvestments}
						setfilteredInvestments={setfilteredInvestments}
					/>
					<Typography variant="subtitle1" align="right" className={classes.total}>
						Grand Total : {toCurrencyFormat(grandTotalPerformance)}
					</Typography>
					{
						filteredPerformance && filteredPerformance.map(i => {
							return (
								<InvestmentPerformance
									key={i.investment}
									investment={i.investment}
									performance={i.performance}
								/>
							);
						})
					}
					
				</div>
			</div>
		);
	} else {
		return (
			<div>
				<TitleHeader title="Performance" />
				<LinearProgress color="secondary" className={classes.progress} />
			</div>
		);
	}
}

AllPerformance.propTypes = {
	allAccountsTransactions: PropTypes.array.isRequired,
	allInvestmentsList: PropTypes.array.isRequired,
	allInvestmentsPrice: PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
	filteredInvestments: PropTypes.array.isRequired,
	setfilteredInvestments: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
	allAccountsTransactions: state.allAccountsTransactions,
	allInvestmentsList: state.allInvestmentsList,
	allInvestmentsPrice: state.allInvestmentsPrice,
	filteredInvestments: state.filteredInvestments
});

const mapDispatchToProps = dispatch => ({
	setfilteredInvestments (params) {
		dispatch(setfilteredInvestments(params));
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(AllPerformance));
