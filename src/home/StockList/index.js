import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

import { toCurrencyFormatWithSymbol } from '../../utils/formatting';

const getInvestmentsFromAccounts = (accounts) => {
	if (!accounts) return [];

	const accountInvestments = accounts.flatMap(account => 
		account.investments.map(investment => ({
			name: investment.name,
			currency: account.currency,
			quantity: investment.quantity,
			purchasedValue: investment.appraisedValue,
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
	})).filter(({ quantity }) => quantity > 0);
};

export function StockList () {
	const accountList = useSelector((state) => state.accountList);
	const stockList = useMemo(() => getInvestmentsFromAccounts(accountList), [accountList]);

	return (
		<Box p={{ xs:1 }}>
			<Table>
				<TableBody>
					{
						stockList.map(i => {
							return (
								<TableRow key={i.name}>
									<TableCell align="left">
										<Box>
											{i.name}
										</Box>
										<Typography variant="caption" sx={{ color: 'rgb(158, 158, 164)' }}>
											{i.quantity.toLocaleString()}
										</Typography>
									</TableCell>
									<TableCell align="right">
										<Box>
											{toCurrencyFormatWithSymbol(i.appraisedValue, i.currency)}
										</Box>
										<Typography variant="caption" sx={{ color: i.return > 0 ? 'rgb(125, 216, 161)':'rgb(255, 80, 0)' }}>
											{`${Math.round(i.profit).toLocaleString()} (${(i.return* 100).toFixed(2) + '%'})`}
										</Typography>
									</TableCell>
								</TableRow>
							);
						})
					}
				</TableBody>
			</Table>
		</Box>
	);
}

export default StockList;
