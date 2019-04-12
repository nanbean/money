import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import Typography from '@material-ui/core/Typography';

import InvestmentPerformance from '../components/InvestmentPerformance';
import InvestmentFilter from '../components/InvestmentFilter';
import TitleHeader from '../components/TitleHeader';

import {
	getAllInvestmentsTransactionsAction,
	getAllInvestmentsPriceAction,
	setfilteredInvestments
} from '../actions/investmentActions';
import { toCurrencyFormat } from '../utils/formatting';
import { getInvestmentPerformance } from '../utils/performance';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing.unit * 3,
		[theme.breakpoints.down('sm')]: {
			padding: 0
		}
	},
	total: {
		marginTop: theme.spacing.unit,
		marginRight: theme.spacing.unit
	}
});

class AllPerformance extends Component {
	componentDidMount () {
		this.props.getAllInvestmentsTransactionsAction();
		this.props.getAllInvestmentsPriceAction();
	}

	render () {
		const {
			isMobile,
			allInvestmentsTransactions,
			allInvestmentsPrice,
			filteredInvestments,
			allInvestmentsFiltered,
			classes
		} = this.props;

		const allPerformance = allInvestmentsTransactions.length > 0 && allInvestmentsPrice.length > 0 && allInvestmentsTransactions.map(i => {
			const investmentTransactions = i.transactions;
			const investmentPrice = allInvestmentsPrice.find(p => p.investment === i.investment).price;
			const investment = i.investment;
			const performance = getInvestmentPerformance(investmentTransactions, investmentPrice);
			const totalPerformance = performance.length > 0 && performance.map(l => l.periodReturn).reduce((a, b) => a + b);
			const totalQuantity = performance.length > 0 && performance.map(m => m.quantity).reduce((a, b) => a + b);

			return {
				investment: investment,
				performance: performance,
				totalPerformance: totalPerformance,
				totalQuantity: totalQuantity
			};
		});

		const filteredPerformance = allPerformance.length > 0 && allPerformance.filter(i => {
			return filteredInvestments.find(j => j === i.investment);
		});
		const grandTotalPerformance = filteredPerformance.length > 0 ? filteredPerformance.map(l => l.totalPerformance).reduce((a, b) => a + b) : 0;

		return (
			<div>
				<TitleHeader title="Performance" />
				<div className={classes.container}>
					<InvestmentFilter
						allInvestmentsPrice={allInvestmentsPrice}
						filteredInvestments={filteredInvestments}
						allInvestmentsFiltered={allInvestmentsFiltered}
						setfilteredInvestments={this.props.setfilteredInvestments}
					/>
					<Typography variant="subtitle1" align="right" className={classes.total}>
						Grand Total : {toCurrencyFormat(grandTotalPerformance)}
					</Typography>
					{
						filteredPerformance && filteredPerformance.map(i => {
							return (
								<InvestmentPerformance
									key={i.investment}
									isMobile={isMobile}
									investment={i.investment}
									performance={i.performance}
								/>
							);
						})
					}
					
				</div>
			</div>
		);
	}
}

AllPerformance.propTypes = {
	allInvestmentsFiltered: PropTypes.bool.isRequired,
	allInvestmentsPrice: PropTypes.array.isRequired,
	allInvestmentsTransactions: PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
	filteredInvestments: PropTypes.array.isRequired,
	getAllInvestmentsPriceAction: PropTypes.func.isRequired,
	getAllInvestmentsTransactionsAction: PropTypes.func.isRequired,
	setfilteredInvestments: PropTypes.func.isRequired,
	isMobile: PropTypes.bool
};

const mapStateToProps = state => ({
	isMobile: state.ui.isMobile,
	allInvestmentsPrice: state.allInvestmentsPrice,
	allInvestmentsTransactions: state.allInvestmentsTransactions,
	filteredInvestments: state.filteredInvestments,
	allInvestmentsFiltered: state.allInvestmentsFiltered
});

const mapDispatchToProps = dispatch => ({
	getAllInvestmentsTransactionsAction () {
		dispatch(getAllInvestmentsTransactionsAction());
	},
	getAllInvestmentsPriceAction () {
		dispatch(getAllInvestmentsPriceAction());
	},
	setfilteredInvestments (params) {
		dispatch(setfilteredInvestments(params));
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(AllPerformance));
