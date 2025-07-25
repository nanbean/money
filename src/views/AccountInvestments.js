import React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import {
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography
} from '@mui/material';

import { getAccountPerformance } from '../utils/performance';
import Amount from '../components/Amount';
import Quantity from '../components/Quantity';

import useDarkMode from '../hooks/useDarkMode';
import {
	POSITIVE_AMOUNT_DARK_COLOR,
	POSITIVE_AMOUNT_LIGHT_COLOR,
	NEGATIVE_AMOUNT_COLOR
} from '../constants';

export function AccountInvestments ({ currency }) {
	const isDarkMode = useDarkMode();
	const account = useSelector((state) => state.account);
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const allInvestmentsPrice = useSelector((state) => state.allInvestmentsPrice);
	const accountInvestments = useSelector((state) => state.accountInvestments);
	const allInvestmentsTransactions = allAccountsTransactions.filter(i => i.accountId && i.accountId.startsWith('account:Invst'));
	const accountPerformance = getAccountPerformance(account, accountInvestments, allInvestmentsTransactions, allInvestmentsPrice);
	const totalCostBasis = accountPerformance.length > 0 ? accountPerformance.map(i => i.costBasis).reduce((a, b) => a + b) : 0;
	const totalMarketValue = accountPerformance.length > 0 ? accountPerformance.map(i => i.marketValue).reduce((a, b) => a + b) : 0;
	const totalPeriodGain = accountPerformance.length > 0 ? accountPerformance.map(i => i.periodGain).reduce((a, b) => a + b) : 0;
	const totalPeriodReturn = accountPerformance.length > 0 ? accountPerformance.map(i => i.periodReturn).reduce((a, b) => a + b) : 0;
	const totalBalance = (accountList.find(i => i.name === account) || {}).balance;
	const cash = totalBalance - totalMarketValue;


	const investmentTable = (
		<TableContainer component={Paper} elevation={2}>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>
							<Typography variant="body2">Investment</Typography>
							<Typography variant="body2">Price * Qty</Typography>
							<Typography variant="body2">(%Port)</Typography>
						</TableCell>
						<TableCell align="right">
							<Typography variant="body2">Cost</Typography>
							<Typography variant="body2">Market</Typography>
						</TableCell>
						<TableCell align="right">
							<Typography variant="body2">G/L</Typography>
							<Typography variant="body2">Return</Typography>
							<Typography variant="body2">(%)</Typography>
						</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{accountPerformance.filter(j => j.name).map(i => (
						<TableRow key={i.name}>
							<TableCell component="th" scope="row">
								<Stack>
									<Typography variant="body2">{i.name}</Typography>
									<Stack direction="row" spacing={0.5} alignItems="center">
										<Amount value={i.price} currency={currency} showSymbol showOriginal />
										<Typography variant="body2">*</Typography>
										<Quantity value={i.quantity}/>
										
									</Stack>
									<Typography variant="body2">({`${(i.marketValue / totalMarketValue * 100).toFixed(2)}%`})</Typography>
								</Stack>
							</TableCell>
							<TableCell align="right">
								<Stack>
									<Amount value={i.costBasis} currency={currency} showSymbol />
									<Amount value={i.marketValue} currency={currency} showSymbol />
								</Stack>
							</TableCell>
							<TableCell align="right">
								<Stack>
									<Amount value={i.periodGain} currency={currency} showSymbol negativeColor />
									<Amount value={i.periodReturn} currency={currency} showSymbol negativeColor />
									<Typography variant="caption" sx={{ color: i.periodReturn > 0 ? (isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR) : NEGATIVE_AMOUNT_COLOR }}>
										({(i.costBasis !== 0 ? (i.periodReturn / i.costBasis * 100) : 0).toFixed(2)}%)
									</Typography>
								</Stack>
							</TableCell>
						</TableRow>
					))}
					<TableRow>
						<TableCell><Typography variant="body2">Cash</Typography></TableCell>
						<TableCell align="right">
							<Amount value={cash} currency={currency} showSymbol />
						</TableCell>
						<TableCell />
					</TableRow>
					<TableRow sx={{ '& > *': { borderTop: '2px solid rgba(224, 224, 224, 1)', fontWeight: 'bold' } }}>
						<TableCell component="th" scope="row">
							<Typography variant="body2">Total</Typography>
						</TableCell>
						<TableCell align="right">
							<Stack>
								<Amount value={totalCostBasis} currency={currency} showSymbol />
								<Amount value={totalBalance} currency={currency} showSymbol />
							</Stack>
						</TableCell>
						<TableCell align="right">
							<Stack>
								<Amount value={totalPeriodGain} currency={currency} showSymbol negativeColor />
								<Amount value={totalPeriodReturn} currency={currency} showSymbol negativeColor />
								<Typography variant="caption" sx={{ color: totalPeriodReturn > 0 ? (isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR) : NEGATIVE_AMOUNT_COLOR }}>
									({(totalCostBasis !== 0 ? (totalPeriodReturn / totalCostBasis * 100) : 0).toFixed(2)}%)
								</Typography>
							</Stack>
						</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
	);

	return (
		investmentTable
	);
}

AccountInvestments.propTypes = {
	currency: PropTypes.string
};

export default AccountInvestments;
