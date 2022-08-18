import React from 'react';
import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';

import PerformanceGrid from '../components/PerformanceGrid';

export function InvestmentPerformance ({
	investment,
	performance
}) {
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
			<Typography
				variant="subtitle1"
				sx={(theme) => ({
					margin: theme.spacing(0.5)
				})}>
				{investment}
			</Typography>
			<PerformanceGrid
				performanceData={performanceData}
			/>
		</div>
	);
}

InvestmentPerformance.propTypes = {
	investment: PropTypes.string.isRequired,
	performance: PropTypes.array.isRequired
};

export default InvestmentPerformance;
