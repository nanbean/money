import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { styled } from '@mui/material/styles';

import Paper from '@mui/material/Paper';
import FormControl from '@mui/material/FormControl';
import Input from '@mui/material/Input';
import InputAdornment from '@mui/material/InputAdornment';

import SearchIcon from '@mui/icons-material/Search';

import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';

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
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const [filteredTransactions, setFilteredTransactions] = useState([]);
	const [keyword, setKeyword] = useState(useParams().keyword);

	useEffect(() => {
		updateFilteredTransactions(allAccountsTransactions, keyword);
	}, [keyword, allAccountsTransactions]);

	const updateFilteredTransactions = (allAccountsTransactions, keyword) => {
		if (keyword) {
			let filteredTransactions = [];

			allAccountsTransactions.forEach(i => {
				if (i.type === 'CCard' || i.type === 'Bank' || i.type === 'Cash') {
					filteredTransactions.push(i);
				}
			});

			filteredTransactions = filteredTransactions.filter(i => i.category.match(new RegExp(keyword, 'i')) || i.payee.match(new RegExp(keyword, 'i')) ||
						(i.subcategory && i.subcategory.match(new RegExp(keyword, 'i'))) || (i.memo && i.memo.match(new RegExp(keyword, 'i')))
			);
	
			setFilteredTransactions(filteredTransactions);
			setKeyword(keyword);
		}
	};

	const onSearchKeyPress = (e) => {
		if (e.key === 'Enter' && e.target.value) {
			updateFilteredTransactions(allAccountsTransactions, e.target.value);
		}
	};

	const onKeywordChange = (e) => {
		setKeyword(e.target.value);
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
						<FormControl margin="normal" required fullWidth>
							<Input
								id="search"
								name="search"
								autoComplete="search"
								autoFocus
								value={keyword}
								onChange={onKeywordChange}
								onKeyPress={onSearchKeyPress}
								startAdornment={
									<InputAdornment position="start">
										<SearchIcon />
									</InputAdornment>
								}
							/>
						</FormControl>
					</Sticky>
					{
						filteredTransactions.length > 0 &&
						<BankTransactions
							showAccount
							transactions={filteredTransactions}
						/>
					}
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
