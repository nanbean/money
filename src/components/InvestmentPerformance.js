import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import Typography from '@material-ui/core/Typography';

import PerformanceGrid from '../components/PerformanceGrid';

const styles = theme => ({
	subject: {
		margin: theme.spacing.unit / 2
	}
});

class InvestmentPerformance extends Component {

	render () {
		const {
			classes,
			investment,
			performance
		} = this.props;
		const totalPerformance = performance.length > 0 ? performance.map(l => l.periodReturn).reduce((a, b) => a + b) : 0;
		const totalQuantity = performance.length > 0 ? performance.map(m => m.quantity).reduce((a, b) => a + b) : 0;
		const totalGain = performance.length > 0 ? performance.map(l => l.periodGain).reduce((a, b) => a + b) : 0;
		const totalCostBasis = performance.length > 0 ? performance.map(m => m.costBasis).reduce((a, b) => a + b) : 0;
		const totalMarketValue = performance.length > 0 ? performance.map(l => l.marketValue).reduce((a, b) => a + b) : 0;

		const performanceData = [
			[
				'Account',
				'Cost Basis',
				'Market Value',
				'Realized Gain/Loss',
				'Return for Period',
				'Quantity'
			],
			...performance.map(i => {
				return [
					i.account,
					i.costBasis,
					i.marketValue,
					i.periodGain,
					i.periodReturn,
					i.quantity
				];
			}),
			[
				'Total',
				totalCostBasis,
				totalMarketValue,
				totalGain,
				totalPerformance,
				totalQuantity
			]
		];

		return (
			<div>
				<Typography variant="subtitle1" className={classes.subject}>
					{investment}
				</Typography>
				<PerformanceGrid
					performanceData={performanceData}
				/>
			</div>
		);
	}
}

InvestmentPerformance.propTypes = {
	classes: PropTypes.object.isRequired,
	investment: PropTypes.string.isRequired,
	performance: PropTypes.array.isRequired
};

export default withStyles(styles)(InvestmentPerformance);
