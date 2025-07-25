import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

import moment from 'moment';

import Layout from '../components/Layout';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';
import SortMenuButton from '../components/SortMenuButton';
import AccountFilter from '../components/AccountFilter';
import Amount from '../components/Amount';

import useWidth from '../hooks/useWidth';

const filterTransactions = ( transactions, startDate, endDate, filteredAccounts ) => {
	const validTypes = ['Bank', 'CCard', 'Cash'];

	if (!filteredAccounts || filteredAccounts.length === 0) {
		return [];
	}

	return transactions.filter(t => {
		const accountId = t.accountId;
		// accountId: 'account:Bank:XXX' or 'account:CCard:XXX' or 'account:Cash:XXX'
		const type = accountId && accountId.split(':')[1];
		if (!validTypes.includes(type)) return false;

		const accountName = t.account;
		if (!filteredAccounts.includes(accountName)) {
			return false;
		}

		const date = moment(t.date);
		return (!startDate || date.isSameOrAfter(moment(startDate), 'day')) &&
				(!endDate || date.isSameOrBefore(moment(endDate), 'day'));
	});
};

const Transactions = () => {
	const allAccountsTransactions = useSelector(state => state.allAccountsTransactions);
	const accountList = useSelector(state => state.accountList);
	const width = useWidth();
	const isSmallScreen = width === 'xs' || width === 'sm';
	const [dateRange, setDateRange] = useState(() => {
		const end = moment();
		const start = moment().subtract(1, 'months');
		return { start, end };
	});
	const [selectedRange, setSelectedRange] = useState('1m');
	const [filteredAccounts, setFilteredAccounts] = useState([]);
	const initialized = useRef(false);

	const dateRangeOptions = [
		{ value: '1m', label: '1 Month', getRange: () => ({ start: moment().subtract(1, 'months'), end: moment() }) },
		{ value: '3m', label: '3 Months', getRange: () => ({ start: moment().subtract(3, 'months'), end: moment() }) },
		{ value: '6m', label: '6 Months', getRange: () => ({ start: moment().subtract(6, 'months'), end: moment() }) },
		{ value: '1y', label: '1 Year', getRange: () => ({ start: moment().subtract(12, 'months'), end: moment() }) },
		{ value: 'all', label: 'All', getRange: () => ({ start: moment('2000-01-01'), end: moment() }) }
	];

	const allBankAccounts = useMemo(() => {
		const validTypes = ['Bank', 'CCard', 'Cash'];
		if (!accountList) return [];
		return accountList
			.filter(a => validTypes.includes(a.type))
			.map(a => a.name);
	}, [accountList]);

	useEffect(() => {
		if (!initialized.current && allBankAccounts.length > 0) {
			setFilteredAccounts(allBankAccounts);
			initialized.current = true;
		}
	}, [allBankAccounts]);

	const filteredTransactions = useMemo(() => {
		return filterTransactions(allAccountsTransactions, dateRange.start, dateRange.end, filteredAccounts);
	}, [allAccountsTransactions, dateRange, filteredAccounts]);

	const handleDateChange = (start, end) => {
		setDateRange({ start: moment(start), end: moment(end) });
	};

	const handleRangeChange = (value) => {
		setSelectedRange(value);
		const option = dateRangeOptions.find(opt => opt.value === value);
		if (option) {
			const { start, end } = option.getRange();
			handleDateChange(start, end);
		}
	};

	const calculateIncomeExpense = (transactions, accountList, displayCurrency, exchangeRate) => {
		let income = 0;
		let expense = 0;

		if (!transactions.length || !accountList.length || !displayCurrency || typeof exchangeRate === 'undefined') {
			return { income: 0, expense: 0 };
		}

		const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate !== 0) ? exchangeRate : 1;
	
		transactions.forEach(transaction => {
			// Exclude transfers between accounts from income/expense calculation
			if (transaction.category && transaction.category.startsWith('[')) {
				return;
			}

			let amount = transaction.amount;
			const account = accountList.find(acc => acc._id === transaction.accountId);
			const transactionCurrency = account?.currency || 'KRW';

			if (transactionCurrency !== displayCurrency) {
				if (displayCurrency === 'KRW' && transactionCurrency === 'USD') {
					amount *= validExchangeRate;
				} else if (displayCurrency === 'USD' && transactionCurrency === 'KRW') {
					amount /= validExchangeRate;
				}
			}

			if (amount > 0) {
				income += amount;
			} else {
				expense += amount;
			}
		});
		return { income, expense };
	};

	const { currency: displayCurrency, exchangeRate } = useSelector(state => state.settings);

	const { income, expense } = useMemo(() => {
		return calculateIncomeExpense(filteredTransactions, accountList, displayCurrency, exchangeRate);
	}, [filteredTransactions, accountList, displayCurrency, exchangeRate]);

	const validTransactionsExist = useMemo(() => {
		return allAccountsTransactions && allAccountsTransactions.length > 0;
	}, [allAccountsTransactions]);

	const incomeExpenseSummary = validTransactionsExist ? (
		isSmallScreen ? (
			<Chip
				variant="outlined"
				label={
					<Typography variant="subtitle2" component="div">
						<Amount value={income} size="small" showSymbol={false} currency={displayCurrency} />
						{' / '}
						<Amount value={expense} size="small" negativeColor showSymbol={false} currency={displayCurrency} />
					</Typography>
				}
			/>
		) : (
			<Stack direction="column" spacing={1}>
				<Chip
					variant="outlined"
					label={<Typography variant="subtitle2">Income: <Amount value={income} size="small" showSymbol currency={displayCurrency} /></Typography>}
				/>
				<Chip
					variant="outlined"
					label={<Typography variant="subtitle2">Expense: <Amount value={expense} size="small" negativeColor showSymbol currency={displayCurrency} /></Typography>}
				/>
			</Stack>
		)
	) : (
		<Typography variant="subtitle1">No transactions available</Typography>
	);

	const filterControls = (
		<Stack direction={isSmallScreen ? 'row' : 'column'} spacing={1} alignItems={isSmallScreen ? 'center' : 'stretch'}>
			<SortMenuButton
				value={selectedRange}
				onChange={handleRangeChange}
				options={dateRangeOptions}
			/>
			<AccountFilter
				allAccounts={allBankAccounts}
				filteredAccounts={filteredAccounts}
				setfilteredAccounts={setFilteredAccounts}
			/>
		</Stack>
	);

	return (
		<Layout title="Transactions">
			{isSmallScreen ? (
				<>
					<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
						{incomeExpenseSummary}
						{filterControls}
					</Stack>
					<Box sx={{ flex: 1, textAlign: 'center' }}>
						<BankTransactions showAccount transactions={filteredTransactions} />
					</Box>
				</>
			) : (
				<Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
					<Box sx={{ width: 250, flexShrink: 0 }}>
						<Paper elevation={2} sx={{ p: 2, height: '100%' }}>
							<Stack direction="column" spacing={1}>
								{filterControls}
								{incomeExpenseSummary}
							</Stack>
						</Paper>
					</Box>
					<Box sx={{ flex: 1 }}>
						<BankTransactions showAccount transactions={filteredTransactions} />
					</Box>
				</Box>
			)}
			<BankTransactionModal
				isEdit={true}
				transactions={filteredTransactions} // TODO: need to pass allTransactions for input autocomplete
			/>

		</Layout>
	);
};

export default Transactions;
