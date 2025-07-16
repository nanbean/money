import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import moment from 'moment';

import Layout from '../components/Layout';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';
import SortMenuButton from '../components/SortMenuButton';
import AccountFilter from '../components/AccountFilter';
import Amount from '../components/Amount';

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

	return (
		<Layout title="Transactions">

			<Stack direction="row" alignItems="center">
				<Stack sx={{ ml: 1 }} direction="row" justifyContent="flex-start" alignItems="baseline">
					{validTransactionsExist && (
						<>
							<Typography variant="subtitle1" sx={{ mr: 1 }}>
								Income :
							</Typography>
							<Amount value={income} size="medium" showSymbol currency={displayCurrency} />
							<Typography variant="subtitle1" sx={{ ml: 2, mr: 1 }}>
								Expense :
							</Typography>
							<Amount value={expense} size="medium" negativeColor showSymbol currency={displayCurrency} />
						</>
					)}
					{!validTransactionsExist && (
						<Typography variant="subtitle1">No transactions available</Typography>
					)}
				</Stack>
				<Stack sx={{ marginLeft: 'auto' }} direction="row" justifyContent="flex-end" alignItems="center">
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
			</Stack>
			<Box sx={{ flex: 1, mb: 1, textAlign: 'center' }}>
				<BankTransactions
					showAccount
					transactions={filteredTransactions}
				/>
			</Box>
			<BankTransactionModal
				isEdit={true}
				transactions={filteredTransactions} // TODO: need to pass allTransactions for input autocomplete
			/>

		</Layout>
	);
};

export default Transactions;
