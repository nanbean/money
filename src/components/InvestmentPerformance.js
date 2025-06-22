import React from 'react';
import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import NormalGrid from '../components/NormalGrid';
import TossIcon from './icons/TossIcon';

export function InvestmentPerformance ({
	investment,
	performance,
	symbol,
	price,
	currency
}) {
	const totalPerformance = performance.length > 0 ? performance.map(l => l.periodReturn).reduce((a, b) => a + b) : 0;
	const totalQuantity = performance.length > 0 ? performance.map(m => m.quantity).reduce((a, b) => a + b) : 0;
	const totalGain = performance.length > 0 ? performance.map(l => l.periodGain).reduce((a, b) => a + b) : 0;
	const totalDividend = performance.length > 0 ? performance.map(l => l.periodDiv).reduce((a, b) => a + b) : 0;
	const totalCostBasis = performance.length > 0 ? performance.map(m => m.costBasis).reduce((a, b) => a + b) : 0;
	const totalMarketValue = performance.length > 0 ? performance.map(l => l.marketValue).reduce((a, b) => a + b) : 0;
	const tossSymbol = symbol ? symbol.split('.')[0] : '';
	const handleTossClick = () => {
		if (tossSymbol) {
			window.open(`https://tossinvest.com/stocks/${tossSymbol}`, '_blank', 'noopener,noreferrer');
		}
	};

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
				{ type: 'noColorCurrency', currency, value: i.costBasis },
				{ type: 'noColorCurrency', currency, value: i.marketValue },
				{ type: 'currency', currency, value: i.periodGain },
				{ type: 'currency', currency, value: i.periodDiv },
				{ type: 'currency', currency, value: i.periodReturn },
				{ type: 'noColorCurrency', currency, value: price, showOriginal: true },
				{ type: 'quantity', value: i.quantity }
			];
		}),
		[
			{ type: 'label', value: 'Total' },
			{ type: 'noColorCurrency', currency, value: totalCostBasis },
			{ type: 'noColorCurrency', currency, value: totalMarketValue },
			{ type: 'currency', currency, value: totalGain },
			{ type: 'currency', currency, value: totalDividend },
			{ type: 'currency', currency, value: totalPerformance },
			{ type: 'label', value: '' },
			{ type: 'quantity', value: totalQuantity }
		]
	];

	return (
		<div>
			<Stack
				direction="row"
				alignItems="center"
				spacing={0.5}
				sx={(theme) => ({
					margin: theme.spacing(0.5)
				})}
			>
				<Typography variant="subtitle1">
					{investment}
				</Typography>
				{tossSymbol && (
					<IconButton onClick={handleTossClick} size="small" aria-label="open in toss">
						<TossIcon sx={{ width: '1.25rem', height: '1.25rem' }} />
					</IconButton>
				)}
			</Stack>
			<NormalGrid
				gridData={performanceData}
			/>
		</div>
	);
}

InvestmentPerformance.propTypes = {
	investment: PropTypes.string.isRequired,
	performance: PropTypes.array.isRequired,
	currency: PropTypes.string,
	price: PropTypes.number,
	symbol: PropTypes.string
};

export default InvestmentPerformance;
