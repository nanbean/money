import React from 'react';
import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';

import NormalGrid from '../components/NormalGrid';

export function InvestmentPerformance ({
	investment,
	performance,
	price,
	currency
}) {
	const totalPerformance = performance.length > 0 ? performance.map(l => l.periodReturn).reduce((a, b) => a + b) : 0;
	const totalQuantity = performance.length > 0 ? performance.map(m => m.quantity).reduce((a, b) => a + b) : 0;
	const totalGain = performance.length > 0 ? performance.map(l => l.periodGain).reduce((a, b) => a + b) : 0;
	const totalDividend = performance.length > 0 ? performance.map(l => l.periodDiv).reduce((a, b) => a + b) : 0;
	const totalCostBasis = performance.length > 0 ? performance.map(m => m.costBasis).reduce((a, b) => a + b) : 0;
	const totalMarketValue = performance.length > 0 ? performance.map(l => l.marketValue).reduce((a, b) => a + b) : 0;

	const performanceData = [
		[
			{ type: 'label', value: 'Account' },
			{ type: 'label', value: 'Cost Basis' },
			{ type: 'label', value: 'Market Value' },
			{ type: 'label', value: 'Realized Gain/Loss' },
			{ type: 'label', value: 'Dividend' },
			{ type: 'label', value: 'Return for Period' },
			{ type: 'label', value: 'Price' },
			{ type: 'label', value: 'Quantity' }
		],
		...performance.map(i => {
			return [
				{ value: i.account },
				{ type: 'currency', currency, value: i.costBasis },
				{ type: 'currency', currency, value: i.marketValue },
				{ type: 'currency', currency, value: i.periodGain },
				{ type: 'currency', currency, value: i.periodDiv },
				{ type: 'currency', currency, value: i.periodReturn },
				{ type: 'currency', currency, value: price },
				{ value: i.quantity }
			];
		}),
		[
			{ type: 'label', value: 'Total' },
			{ type: 'currency', currency, value: totalCostBasis },
			{ type: 'currency', currency, value: totalMarketValue },
			{ type: 'currency', currency, value: totalGain },
			{ type: 'currency', currency, value: totalDividend },
			{ type: 'currency', currency, value: totalPerformance },
			{ type: 'label', value: '' },
			{ value: totalQuantity }
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
			<NormalGrid
				gridData={performanceData}
			/>
		</div>
	);
}

InvestmentPerformance.propTypes = {
	investment: PropTypes.string.isRequired,
	performance: PropTypes.array.isRequired,
	currency: PropTypes.string
};

export default InvestmentPerformance;
