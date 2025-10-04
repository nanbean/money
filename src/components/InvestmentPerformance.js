import React from 'react';
import PropTypes from 'prop-types';

import {
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	IconButton
} from '@mui/material';

import TossIcon from './icons/TossIcon';
import Amount from './Amount';
import Quantity from './Quantity';

import useDarkMode from '../hooks/useDarkMode';
import useWidth from '../hooks/useWidth';

import {
	POSITIVE_AMOUNT_DARK_COLOR,
	POSITIVE_AMOUNT_LIGHT_COLOR,
	NEGATIVE_AMOUNT_COLOR
} from '../constants';

export function InvestmentPerformance ({
	investment,
	performance,
	symbol,
	price,
	currency
}) {
	const isDarkMode = useDarkMode();
	const width = useWidth();
	const isSmallScreen = width === 'xs' || width === 'sm';
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

	return (
		<Paper sx={{ p: { xs: 0.5, sm: 1 }, mb: 1 }}>
			<Stack
				direction="row"
				alignItems="center"
				spacing={0.5}
				sx={(theme) => ({
					margin: theme.spacing(0.5)
				})}
			>
				<Typography variant="subtitle1">{investment}</Typography>
				<Amount value={price} currency={currency} showSymbol showOriginal size="large" />
				{tossSymbol && (
					<IconButton onClick={handleTossClick} size="small" aria-label="open in toss">
						<TossIcon sx={{ width: '1.25rem', height: '1.25rem' }} />
					</IconButton>
				)}
			</Stack>
			<TableContainer>
				<Table size="small">
					<TableHead>
						<TableRow>
							{isSmallScreen ? (
								<TableCell>
									<Typography variant="body2">Account</Typography>
									<Typography variant="body2">Qty</Typography>
								</TableCell>
							) : (
								<>
									<TableCell align="left">
										<Typography variant="body2">Account</Typography>
									</TableCell>
									<TableCell align="right">
										<Typography variant="body2">Qty</Typography>
									</TableCell>
								</>
							)}
							{isSmallScreen ? (
								<TableCell align="right">
									<Typography variant="body2">Cost Basis</Typography>
									<Typography variant="body2">Market Value</Typography>
								</TableCell>
							) : (
								<>
									<TableCell align="right">
										<Typography variant="body2">Cost Basis</Typography>
									</TableCell>
									<TableCell align="right">
										<Typography variant="body2">Market Value</Typography>
									</TableCell>
								</>
							)}
							{isSmallScreen ? (
								<TableCell align="right">
									<Typography variant="body2">Gain/Loss</Typography>
									<Typography variant="body2">Div</Typography>
								</TableCell>
							) : (
								<>
									<TableCell align="right">
										<Typography variant="body2">Gain/Loss(Div)</Typography>
									</TableCell>
								</>
							)}
							<TableCell align="right">
								<Stack direction={isSmallScreen ? 'column' : 'row'} justifyContent="flex-end">
									<Typography variant="body2">Return</Typography>
									<Typography variant="body2">(%)</Typography>
								</Stack>
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{performance.map(i => (
							<TableRow key={i.account}>
								{isSmallScreen ? (
									<TableCell component="th" scope="row">
										<Typography variant="body2">{i.account}</Typography>
										<Quantity value={i.quantity}/>
									</TableCell>
								) : (
									<>
										<TableCell align="left">
											<Typography variant="body2">{i.account}</Typography>
										</TableCell>
										<TableCell align="right">
											<Quantity value={i.quantity}/>
										</TableCell>
									</>
								)}
								{isSmallScreen ? (
									<TableCell align="right">
										<Stack>
											<Amount value={i.costBasis} currency={currency} showSymbol />
											<Amount value={i.marketValue} currency={currency} showSymbol />
										</Stack>
									</TableCell>
								) : (
									<>
										<TableCell align="right">
											<Amount value={i.costBasis} currency={currency} showSymbol />
										</TableCell>								
										<TableCell align="right">
											<Amount value={i.marketValue} currency={currency} showSymbol />
										</TableCell>
									</>
								)}
								{isSmallScreen ? (
									<TableCell align="right">
										<Stack>
											<Amount value={i.periodGain} currency={currency} showSymbol negativeColor />
											<Amount value={i.periodDiv} currency={currency} showSymbol negativeColor />
										</Stack>
									</TableCell>
								) : (
									<>
										<TableCell align="right">
											<Stack direction="row" justifyContent="flex-end">
												<Amount value={i.periodGain} currency={currency} showSymbol negativeColor />
												(<Amount value={i.periodDiv} currency={currency} showSymbol negativeColor />)
											</Stack>
										</TableCell>
									</>
								)}
								<TableCell align="right">
									<Stack direction={isSmallScreen ? 'column' : 'row'} justifyContent="flex-end">
										<Amount value={i.periodReturn} currency={currency} showSymbol negativeColor />
										<Typography variant="caption" sx={{ color: i.periodReturn > 0 ? (isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR) : NEGATIVE_AMOUNT_COLOR }}>
											({(i.costBasis !== 0 ? (i.periodReturn / i.costBasis * 100) : 0).toFixed(2)}%)
										</Typography>
									</Stack>
								</TableCell>
							</TableRow>
						))}
						<TableRow sx={{ '& > *': { borderTop: '2px solid rgba(224, 224, 224, 1)', fontWeight: 'bold' } }}>
							{isSmallScreen ? (
								<TableCell component="th" scope="row">
									<Typography variant="body2">Total</Typography>
									<Quantity value={totalQuantity}/>
								</TableCell>
							) : (
								<>
									<TableCell align="left">
										<Typography variant="body2">Total</Typography>
									</TableCell>
									<TableCell align="right">
										<Quantity value={totalQuantity}/>
									</TableCell>
								</>
							)}
							{isSmallScreen ? (
								<TableCell align="right">
									<Stack>
										<Amount value={totalCostBasis} currency={currency} showSymbol />
										<Amount value={totalMarketValue} currency={currency} showSymbol />
									</Stack>
								</TableCell>
							) : (
								<>
									<TableCell align="right">
										<Amount value={totalCostBasis} currency={currency} showSymbol />
									</TableCell>
									<TableCell align="right">
										<Amount value={totalMarketValue} currency={currency} showSymbol />
									</TableCell>
								</>
							)}
							{isSmallScreen ? (
								<TableCell align="right">
									<Stack>
										<Amount value={totalGain} currency={currency} showSymbol negativeColor />
										<Amount value={totalDividend} currency={currency} showSymbol negativeColor />
									</Stack>
								</TableCell>
							) : (
								<>
									<TableCell align="right">
										<Stack direction="row" justifyContent="flex-end">
											<Amount value={totalGain} currency={currency} showSymbol negativeColor />
											(<Amount value={totalDividend} currency={currency} showSymbol negativeColor />)
										</Stack>
									</TableCell>
								</>
							)}
							<TableCell align="right">
								<Stack direction={isSmallScreen ? 'column' : 'row'} justifyContent="flex-end">
									<Amount value={totalPerformance} currency={currency} showSymbol negativeColor />
									<Typography variant="caption" sx={{ color: totalPerformance > 0 ? (isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR) : NEGATIVE_AMOUNT_COLOR }}>
										({(totalCostBasis !== 0 ? (totalPerformance / totalCostBasis * 100) : 0).toFixed(2)}%)
									</Typography>
								</Stack>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</TableContainer>
		</Paper>
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
