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
	TableRow
} from '@mui/material';

import { getAccountPerformance } from '../utils/performance';
import Amount from '../components/Amount';
import Quantity from '../components/Quantity';

export function AccountInvestments ({ currency }) {
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
						<TableCell>Investment (%Port)</TableCell>
						<TableCell align="right">Price / Qty</TableCell>
						<TableCell align="right">Cost / Market</TableCell>
						<TableCell align="right">G/L / Return</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{accountPerformance.filter(j => j.name).map(i => (
						<TableRow key={i.name}>
							<TableCell component="th" scope="row">
								{i.name} ({`${(i.marketValue / totalMarketValue * 100).toFixed(2)}%`})
							</TableCell>
							<TableCell align="right">
								<Stack>
									<Amount value={i.price} currency={currency} showSymbol showOriginal />
									<Quantity value={i.quantity}/>
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
								</Stack>
							</TableCell>
						</TableRow>
					))}
					<TableRow>
						<TableCell>Cash</TableCell>
						<TableCell />
						<TableCell align="right">
							<Amount value={cash} currency={currency} showSymbol />
						</TableCell>
						<TableCell />
					</TableRow>
					<TableRow sx={{ '& > *': { borderTop: '2px solid rgba(224, 224, 224, 1)', fontWeight: 'bold' } }}>
						<TableCell component="th" scope="row">Total</TableCell>
						<TableCell />
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
