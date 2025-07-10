import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { styled } from '@mui/material/styles';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import Input from '@mui/material/Input';
import InputAdornment from '@mui/material/InputAdornment';

import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import SearchIcon from '@mui/icons-material/Search';

import Amount from '../components/Amount';
import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';
import AccountFilter from '../components/AccountFilter';

import useHeight from '../hooks/useHeight';

const Sticky = styled('div')(({ theme }) => ({
	width: '100%',
	position: 'sticky',
	paddingLeft: theme.spacing(1),
	paddingRight: theme.spacing(1),
	[theme.breakpoints.up('lg')]: {
		top: 62
	},
	[theme.breakpoints.down('sm')]: {
		top: 56
	}
}));

export function Search () {
	const accountList = useSelector((state) => state.accountList);
	const allAccounts = accountList.filter(i => (i.type === 'CCard'|| i.type === 'Bank' || i.type === 'Cash') && !i.closed).map(j => j.name);
	const [filteredAccounts, setFilteredAccounts] = useState(allAccounts);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { currency: displayCurrency, exchangeRate } = useSelector((state) => state.settings.general);
	const categoryList = useSelector((state) => state.settings.categoryList);
	const [filteredTransactions, setFilteredTransactions] = useState([]);
	const [searchParams, setSearchParams] = useSearchParams();
	const keyword = searchParams.get('keyword') || '';
	const [inputValue, setInputValue] = useState(keyword);
	const category = searchParams.get('category') || '';
	const subcategory = searchParams.get('subcategory') || '';
	const startDate = searchParams.get('startDate') || '';
	const endDate = searchParams.get('endDate') || '';

	const balance = useMemo(() => {
		if (filteredTransactions.length === 0 || !displayCurrency || typeof exchangeRate === 'undefined') {
			return 0;
		}
		const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate !== 0) ? exchangeRate : 1;

		return filteredTransactions.reduce((sum, transaction) => {
			let amount = transaction.amount;
			const accountDetails = accountList.find(acc => acc._id === transaction.accountId);
			const transactionOriginalCurrency = accountDetails && accountDetails.currency ? accountDetails.currency : 'KRW';

			if (transactionOriginalCurrency !== displayCurrency) {
				if (displayCurrency === 'KRW') { // Display in KRW
					if (transactionOriginalCurrency === 'USD') { // Transaction is USD
						amount *= validExchangeRate;
					}
				} else if (displayCurrency === 'USD') { // Display in USD
					if (transactionOriginalCurrency === 'KRW') { // Transaction is KRW
						amount /= validExchangeRate;
					}
				}
			}
			return sum + amount;
		}, 0);
	}, [filteredTransactions, displayCurrency, exchangeRate, accountList]);

	const transactionHeight = useHeight() - 64 - 64 - 64 - 130; // TODO: Optimize calculation

	useEffect(() => {
		updateFilteredTransactions(filteredAccounts, allAccountsTransactions, keyword, category, subcategory, startDate, endDate);
	}, [keyword, category, subcategory, startDate, endDate, filteredAccounts, allAccountsTransactions]);

	const onFilteredAccountsChange = (e) => {
		setFilteredAccounts(e);
	};

	const updateFilteredTransactions = (filteredAccounts, allAccountsTransactions, keyword, category, subcategory, startDate, endDate) => {
		if (keyword || category || subcategory || startDate || endDate) {
			let filteredTransactions = [];

			filteredTransactions = allAccountsTransactions.filter(transaction => {
				const accountIdParts = transaction?.accountId?.split(':');
				const accountId = accountIdParts?.[2];
				return filteredAccounts.includes(accountId);
			});

			if (category) {
				const escapedCategoryString = category.replace(/[[\]()]/g, '\\$&');
				filteredTransactions = filteredTransactions.filter(i => i.category.match(new RegExp(escapedCategoryString, 'i')));
			}

			if (subcategory) {
				const escapedSubCategoryString = subcategory.replace(/[[\]()]/g, '\\$&');
				filteredTransactions = filteredTransactions.filter(i => i.subcategory && i.subcategory.match(new RegExp(escapedSubCategoryString, 'i')));
			}

			if (startDate) {
				filteredTransactions = filteredTransactions.filter(i => i.date >= startDate);
			}

			if (endDate) {
				filteredTransactions = filteredTransactions.filter(i => i.date <= endDate);
			}

			filteredTransactions = filteredTransactions.filter(i => (i.payee && i.payee.match(new RegExp(keyword, 'i'))) || (i.memo && i.memo.match(new RegExp(keyword, 'i'))));

			setFilteredTransactions(filteredTransactions);
		}
	};

	const onInputValueChange = (e) => {
		const newKeyword = e.target.value;
		setInputValue(newKeyword);

		const params = {};
		if (newKeyword) {
			params.keyword = newKeyword;
		}
		if (category) {
			params.category = category;
		}
		if (subcategory) {
			params.subcategory = subcategory;
		}
		if (startDate) {
			params.startDate = startDate;
		}
		if (endDate) {
			params.endDate = endDate;
		}
		setSearchParams(params, { replace: true });
	};

	const onCategoryChange = (e) => {
		const params = {};
		const categoryArray = e.target.value.split(':');
		if (keyword) {
			params.keyword = keyword;
		}
		if (categoryArray[0]) {
			params.category = categoryArray[0];
		}
		if (categoryArray[1]) {
			params.subcategory = categoryArray[1];
		}
		if (startDate) {
			params.startDate = startDate;
		}
		if (endDate) {
			params.endDate = endDate;
		}
		setSearchParams(params);
	};

	const onStartDateChange = (e) => {
		const params = {};
		if (keyword) {
			params.keyword = keyword;
		}
		if (category) {
			params.category = category;
		}
		if (subcategory) {
			params.subcategory = subcategory;
		}
		if (e.target.value) {
			params.startDate = e.target.value;
		}
		if (endDate) {
			params.endDate = endDate;
		}
		setSearchParams(params);
	};

	const onEndDateChange = (e) => {
		const params = {};
		if (keyword) {
			params.keyword = keyword;
		}
		if (category) {
			params.category = category;
		}
		if (subcategory) {
			params.subcategory = subcategory;
		}
		if (startDate) {
			params.startDate = startDate;
		}
		if (e.target.value) {
			params.endDate = e.target.value;
		}
		setSearchParams(params);
	};

	return (
		<div>
			<TitleHeader title="Search" />
			<Container>
				<Paper
					sx={(theme) => ({
						[theme.breakpoints.up('lg')]: {
							marginTop: theme.spacing(2)
						},
						[theme.breakpoints.down('sm')]: {
							marginTop: 0
						},
						alignItems: 'center'
					})}
				>
					<Sticky>
						<Grid
							container
							spacing={1}
							sx={(theme) => ({
								marginTop: theme.spacing(1),
								marginBottom: theme.spacing(1)
							})}
						>
							<Grid item xs={12}>
								<Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
									<AccountFilter
										allAccounts={allAccounts}
										filteredAccounts={filteredAccounts}
										setfilteredAccounts={onFilteredAccountsChange}
									/>
								</Stack>
							</Grid>
							<Grid item xs={6}>
								<FormControl required fullWidth>
									<Input
										id="search"
										name="search"
										autoComplete="search"
										value={inputValue}
										onChange={onInputValueChange}
										startAdornment={
											<InputAdornment position="start">
												<SearchIcon />
											</InputAdornment>
										}
									/>
								</FormControl>
							</Grid>
							<Grid item xs={6}>
								<FormControl variant="standard"	fullWidth>
									<Select
										value={category && `${category}` + (subcategory ? `:${subcategory}`:'')}
										onChange={onCategoryChange}
									>
										{
											categoryList.map(i => (
												<MenuItem key={i.key} value={i.value}>{i.text}</MenuItem>
											))
										}
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={6}>
								<FormControl fullWidth>
									<Input
										id="startDate"
										type="date"
										name="startDate"
										autoComplete="off"
										placeholder="Start Date"
										value={startDate}
										fullWidth
										onChange={onStartDateChange}
										startAdornment={
											<InputAdornment position="start">
												From
											</InputAdornment>
										}
									/>
								</FormControl>
							</Grid>
							<Grid item xs={6}>
								<FormControl fullWidth>
									<Input
										id="endDate"
										type="date"
										name="endDate"
										autoComplete="off"
										placeholder="End Date"
										value={endDate}
										fullWidth
										onChange={onEndDateChange}
										startAdornment={
											<InputAdornment position="start">
												To
											</InputAdornment>
										}
									/>
								</FormControl>
							</Grid>
						</Grid>
					</Sticky>
					<Box sx={{ height: transactionHeight, textAlign: 'center' }}>
						{
							filteredTransactions.length > 0 &&
							<BankTransactions
								showAccount
								transactions={filteredTransactions}
							/>
						}
					</Box>
					<Stack direction="row" sx={{ justifyContent: 'flex-end', alignItems: 'baseline' }}>
						<Typography
							variant="subtitle1"
							color="inherit"
							gutterBottom
							align="right"
							sx={(theme) => ({
								marginTop: theme.spacing(1),
								marginRight: theme.spacing(1)
							})}
						>
							{'Sum : '}
						</Typography>
						<Amount value={balance} size="large" negativeColor showSymbol currency={displayCurrency}/>
					</Stack>
					<BankTransactionModal
						isEdit={true}
						transactions={filteredTransactions} // TODO: need to pass allTransactions for input autocomplete
					/>
				</Paper>
			</Container>
		</div>
	);
}

export default Search;
