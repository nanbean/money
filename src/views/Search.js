import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import Input from '@mui/material/Input';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';

import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import SearchIcon from '@mui/icons-material/Search';

import Layout from '../components/Layout';
import Amount from '../components/Amount';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';
import AccountFilter from '../components/AccountFilter';

export function Search () {
	const accountList = useSelector((state) => state.accountList);
	const allAccounts = accountList.filter(i => (i.type === 'CCard'|| i.type === 'Bank' || i.type === 'Cash') && !i.closed).map(j => j.name);
	const [filteredAccounts, setFilteredAccounts] = useState(allAccounts);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { currency: displayCurrency, exchangeRate } = useSelector((state) => state.settings);
	const { categoryList } = useSelector((state) => state.settings);
	const [filteredTransactions, setFilteredTransactions] = useState([]);
	const [searchParams, setSearchParams] = useSearchParams();
	const keyword = searchParams.get('keyword') || '';
	const [inputValue, setInputValue] = useState(keyword);
	const category = searchParams.get('category') || '';
	const subcategory = searchParams.get('subcategory') || '';
	const startDate = searchParams.get('startDate') || '';
	const endDate = searchParams.get('endDate') || '';

	const hasFilters = !!(keyword || category || subcategory || startDate || endDate);
	const dateRangeInvalid = !!(startDate && endDate && startDate > endDate);

	const { balanceKRW, balanceUSD } = useMemo(() => {
		if (filteredTransactions.length === 0 || typeof exchangeRate === 'undefined') {
			return { balanceKRW: 0, balanceUSD: 0 };
		}
		const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate !== 0) ? exchangeRate : 1;

		let totalKRW = 0;
		let totalUSD = 0;

		filteredTransactions.forEach(transaction => {
			const accountDetails = accountList.find(acc => acc._id === transaction.accountId);
			const transactionCurrency = accountDetails?.currency || 'KRW';

			if (transactionCurrency === 'KRW') {
				totalKRW += transaction.amount;
				totalUSD += transaction.amount / validExchangeRate;
			} else {
				totalKRW += transaction.amount * validExchangeRate;
				totalUSD += transaction.amount;
			}
		});

		return { balanceKRW: totalKRW, balanceUSD: totalUSD };
	}, [filteredTransactions, exchangeRate, accountList]);

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
		} else {
			setFilteredTransactions([]);
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

	const clearCategoryFilter = () => {
		const params = {};
		if (keyword) params.keyword = keyword;
		if (startDate) params.startDate = startDate;
		if (endDate) params.endDate = endDate;
		setSearchParams(params);
	};

	const clearDateFilter = () => {
		const params = {};
		if (keyword) params.keyword = keyword;
		if (category) params.category = category;
		if (subcategory) params.subcategory = subcategory;
		setSearchParams(params);
	};

	const categoryFilterLabel = subcategory ? `${category}:${subcategory}` : category;
	const dateFilterLabel = startDate && endDate
		? `${startDate} ~ ${endDate}`
		: startDate
			? `${startDate} ~`
			: `~ ${endDate}`;

	return (
		<Layout title="Search">
			<Stack direction="row" alignItems="center" justifyContent="space-between">
				<Chip
					variant="outlined"
					label={
						<Typography variant="subtitle2">
							{filteredTransactions.length}건 · <Amount
								value={displayCurrency === 'KRW' ? balanceUSD : balanceKRW}
								currency={displayCurrency === 'KRW' ? 'USD' : 'KRW'}
								size="small"
								negativeColor
								showSymbol
								showOriginal
							/>
						</Typography>
					}
				/>
				<AccountFilter
					allAccounts={allAccounts}
					filteredAccounts={filteredAccounts}
					setfilteredAccounts={onFilteredAccountsChange}
				/>
			</Stack>
			<Grid
				container
				spacing={1}
				sx={(theme) => ({
					marginTop: theme.spacing(1),
					marginBottom: theme.spacing(1)
				})}
			>
				<Grid item xs={12} md={5}>
					<FormControl variant="standard" required fullWidth>
						<Input
							id="search"
							name="search"
							autoComplete="off"
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
				<Grid item xs={12} md={3}>
					<FormControl variant="standard" fullWidth>
						<Select
							value={category && `${category}` + (subcategory ? `:${subcategory}`:'')}
							onChange={onCategoryChange}
							displayEmpty
						>
							<MenuItem value=""><em>전체</em></MenuItem>
							{
								(categoryList || []).map(i => (
									<MenuItem key={i} value={i}>{i}</MenuItem>
								))
							}
						</Select>
					</FormControl>
				</Grid>
				<Grid item xs={6} md={2}>
					<FormControl variant="standard" fullWidth>
						<Input
							id="startDate"
							type="date"
							name="startDate"
							autoComplete="off"
							value={startDate}
							onChange={onStartDateChange}
							error={dateRangeInvalid}
							startAdornment={
								<InputAdornment position="start">
									From
								</InputAdornment>
							}
						/>
					</FormControl>
				</Grid>
				<Grid item xs={6} md={2}>
					<FormControl variant="standard" fullWidth>
						<Input
							id="endDate"
							type="date"
							name="endDate"
							autoComplete="off"
							value={endDate}
							onChange={onEndDateChange}
							error={dateRangeInvalid}
							startAdornment={
								<InputAdornment position="start">
									To
								</InputAdornment>
							}
						/>
					</FormControl>
				</Grid>
			</Grid>
			{
				dateRangeInvalid &&
					<Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
						시작일이 종료일보다 늦습니다.
					</Typography>
			}
			{
				(category || startDate || endDate) &&
					<Stack direction="row" sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
						{
							category &&
								<Chip
									label={categoryFilterLabel}
									size="small"
									onDelete={clearCategoryFilter}
								/>
						}
						{
							(startDate || endDate) &&
								<Chip
									label={dateFilterLabel}
									size="small"
									onDelete={clearDateFilter}
								/>
						}
					</Stack>
			}
			<Box sx={{ flex: 1, mt: 1, textAlign: 'center' }}>
				{
					filteredTransactions.length > 0 ? (
						<BankTransactions
							showAccount
							transactions={filteredTransactions}
						/>
					) : hasFilters ? (
						<Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
							검색 결과가 없습니다.
						</Typography>
					) : (
						<Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
							검색어 또는 필터를 입력하세요.
						</Typography>
					)
				}
			</Box>
			<BankTransactionModal
				isEdit={true}
				transactions={filteredTransactions} // TODO: need to pass allTransactions for input autocomplete
			/>
		</Layout>
	);
}

export default Search;
