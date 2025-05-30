import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

import { toCurrencyFormatWithSymbol } from '../../utils/formatting';

const linkStyle = {
	textDecoration: 'none',
	color: 'inherit'
};

const getInvestmentsFromAccounts = (accounts) => {
	if (!accounts) return [];

	const accountInvestments = accounts.flatMap(account => 
		account.investments.map(investment => ({
			name: investment.name,
			currency: account.currency,
			quantity: investment.quantity,
			purchasedValue: investment.purchasedValue,
			appraisedValue: investment.appraisedValue,
			profit: investment.appraisedValue - investment.purchasedValue
		}))
	);

	const aggregatedData = accountInvestments.reduce((acc, { name, currency, quantity, purchasedValue, appraisedValue, profit }) => {
		if (!acc[name]) {
			acc[name] = { name, currency, quantity: 0, purchasedValue: 0, appraisedValue: 0, profit: 0 };
		}
		acc[name].quantity += quantity;
		acc[name].purchasedValue += purchasedValue;
		acc[name].appraisedValue += appraisedValue;
		acc[name].profit += profit;
		return acc;
	}, {});

	return Object.values(aggregatedData).map(i => ({
		name: i.name,
		currency: i.currency,
		quantity: i.quantity,
		purchasedValue: i.purchasedValue,
		appraisedValue: i.appraisedValue,
		profit: i.profit,
		return: i.profit / i.purchasedValue
	})).filter(({ quantity }) => quantity > 0).sort((a, b) => b.appraisedValue - a.appraisedValue);
};

export function StockList () {
	const accountList = useSelector((state) => state.accountList);
	const stockList = useMemo(() => getInvestmentsFromAccounts(accountList), [accountList]);
	const { exchangeRate } = useSelector((state) => state.settings.general);
	const { totalProfit, totalPurchasedValue, totalAppraisedValue } = stockList.reduce((totals, investment) => {
		totals.totalProfit += investment.currency === 'USD' ? investment.profit * exchangeRate:investment.profit;
		totals.totalPurchasedValue += investment.currency === 'USD' ? investment.purchasedValue * exchangeRate:investment.purchasedValue;
		totals.totalAppraisedValue += investment.currency === 'USD' ? investment.appraisedValue * exchangeRate:investment.appraisedValue;
		return totals;
	}, { totalProfit: 0, totalPurchasedValue: 0, totalAppraisedValue: 0 });

	return (
		<Box p={{ xs:1 }}>
			<Table>
				<TableBody>
					{
						stockList.map(i => {
							return (
								<TableRow key={i.name}>
									<TableCell align="left">
										<Link to={`/performance/${i.name}`} style={linkStyle}>
											<Box>
												{i.name}
											</Box>
										</Link>
										<Typography variant="caption" sx={{ color: 'grey.500' }}>
											{i.quantity.toLocaleString()}
										</Typography>
									</TableCell>
									<TableCell align="right">
										<Box>
											{toCurrencyFormatWithSymbol(i.appraisedValue, i.currency)}
										</Box>
										<Typography variant="caption" sx={{ color: i.return > 0 ? 'rgb(125, 216, 161)':'rgb(255, 80, 0)' }}>
											{`${toCurrencyFormatWithSymbol(Math.round(i.profit), i.currency)} (${(i.return* 100).toFixed(2) + '%'})`}
										</Typography>
									</TableCell>
								</TableRow>
							);
						})
					}
					<TableRow>
						<TableCell align="left">
							<Box>
								Subtotal
							</Box>
						</TableCell>
						<TableCell align="right">
							<Box>
								{toCurrencyFormatWithSymbol(totalAppraisedValue)}
							</Box>
							<Typography variant="caption" sx={{ color: totalProfit > 0 ? 'rgb(125, 216, 161)':'rgb(255, 80, 0)' }}>
								{`${toCurrencyFormatWithSymbol(Math.round(totalProfit))} (${(totalProfit / totalPurchasedValue * 100).toFixed(2) + '%'})`}
							</Typography>
						</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</Box>
	);
}

export default StockList;
