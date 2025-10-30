import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import TableFooter from '@mui/material/TableFooter';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import moment from 'moment';
import _ from 'lodash';

import Amount from '../../components/Amount';

import {
	YEAR_LIST
} from '../../constants';

export function AmexTracker () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const [year, setYear] = useState(parseInt(moment().format('YYYY'), 10));
	const [expandedPayees, setExpandedPayees] = useState([]);

	const onYearChange = event => {
		setYear(event.target.value);
		setExpandedPayees([]); // Reset expanded rows on year change
	};

	const handlePayeeToggle = (payee) => {
		setExpandedPayees(prev =>
			prev.includes(payee) ? prev.filter(p => p !== payee) : [...prev, payee]);
	};

	const startDate = moment().year(year).startOf('year').format('YYYY-MM-DD');
	const endDate = moment().year(year).endOf('year').format('YYYY-MM-DD');
	const creditTransactions = allAccountsTransactions.filter(i => i.memo?.includes('credit:'))
		.filter(i => i.date >= startDate && i.date <= endDate);

	const totalCredit = creditTransactions.reduce((acc, curr) => {
		const creditValueString = curr.memo.split('credit:')[1];
		const creditValue = parseFloat(creditValueString);
		return acc + (isNaN(creditValue) ? 0 : creditValue);
	}, 0);

	const creditsByPayee = _.reduce(creditTransactions, (result, transaction) => {
		const payee = transaction.payee;
		const creditValueString = transaction.memo.split('credit:')[1];
		const creditValue = parseFloat(creditValueString);

		result[payee] = (result[payee] || 0) + (isNaN(creditValue) ? 0 : creditValue);
		return result;
	}, {});

	const transactionsByPayee = _.groupBy(creditTransactions, 'payee');

	const getCreditValue = (memo) => {
		if (!memo) return 0;
		const creditValueString = memo.split('credit:')[1];
		const creditValue = parseFloat(creditValueString);
		return isNaN(creditValue) ? 0 : creditValue;
	};

	return (
		<Box sx={{ p: 1 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<FormControl size="small" sx={{ minWidth: 150 }}>
					<Select
						value={year}
						onChange={onYearChange}
						inputProps={{
							name: 'year',
							id: 'year-select'
						}}
					>
						{
							YEAR_LIST.map(i => (
								<MenuItem key={i.key} value={i.value}>{i.text}</MenuItem>
							))
						}
					</Select>
				</FormControl>
			</Stack>
			<TableContainer component={Paper} sx={{ mt: 2 }}>
				<Table size="small">
					<TableBody>
						{Object.entries(transactionsByPayee).map(([payee, transactions]) => {
							const totalForPayee = creditsByPayee[payee];
							const isExpanded = expandedPayees.includes(payee);
							return (
								<React.Fragment key={payee}>
									<TableRow sx={{ backgroundColor: 'action.hover', cursor: 'pointer' }} onClick={() => handlePayeeToggle(payee)}>
										<TableCell sx={{ fontWeight: 'bold' }}>
											<IconButton size="small">
												{isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
											</IconButton>
											{payee}
										</TableCell>
										<TableCell align="right" sx={{ fontWeight: 'bold' }}>
											<Amount value={totalForPayee} currency={'USD'} ignoreDisplayCurrency />
										</TableCell>
									</TableRow>
									{isExpanded && transactions.map(transaction => (
										<TableRow key={transaction._id}>
											<TableCell sx={{ pl: 4 }}>
												{transaction.date}
											</TableCell>
											<TableCell align="right">
												<Amount value={getCreditValue(transaction.memo)} currency={'USD'} ignoreDisplayCurrency />
											</TableCell>
										</TableRow>
									))}
								</React.Fragment>
							);
						})}
					</TableBody>
					<TableFooter>
						<TableRow>
							<TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
							<TableCell align="right" sx={{ fontWeight: 'bold' }}>
								<Amount value={totalCredit} currency={'USD'} ignoreDisplayCurrency />
							</TableCell>
						</TableRow>
					</TableFooter>
				</Table>
			</TableContainer>
		</Box>
	);
}

export default AmexTracker;
