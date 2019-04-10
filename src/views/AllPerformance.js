import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import Paper from '@material-ui/core/Paper';
import Divider from '@material-ui/core/Divider';
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
		maxWidth: 1200,
		[theme.breakpoints.up('lg')]: {
			margin: '1em auto'
		},
		[theme.breakpoints.down('sm')]: {
			margin: 0
		}
	},
	paper: {
		[theme.breakpoints.up('lg')]: {
			marginTop: theme.spacing.unit * 2
		},
		[theme.breakpoints.down('sm')]: {
			marginTop: 0
		},
		alignItems: 'center'
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
					<Paper className={classes.paper}>
						<div className="container-header">
							<InvestmentFilter
								allInvestmentsPrice={allInvestmentsPrice}
								filteredInvestments={filteredInvestments}
								allInvestmentsFiltered={allInvestmentsFiltered}
								setfilteredInvestments={this.props.setfilteredInvestments}
							/>
						</div>
						<Divider />
						<Typography variant="h6" color="inherit" gutterBottom align="right" className={classes.total}>
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
					</Paper>
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
