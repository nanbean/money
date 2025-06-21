import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import SortIcon from '@mui/icons-material/Sort';

import BankTransactionModal from '../../components/BankTransactionModal';
import Payee from '../../components/Payee';
import Amount from '../../components/Amount';
import CategoryIcon from '../../components/CategoryIcon';

import { updateGeneralAction } from '../../actions/couchdbSettingActions';
import {
	openTransactionInModal
} from '../../actions/ui/form/bankTransaction';

import { TYPE_ICON_MAP } from '../../constants';

const updateTransactionsWithAccounts = (transactions, accounts) => {
	if (!accounts.length || !transactions.length) return [];

	return transactions.map(transaction => {
		const account = accounts.find(account => account._id === transaction.accountId);
		return account ? { ...transaction, currency: account.currency } : transaction;
	});
};

export function LatestTransactions () {
	const accountList = useSelector((state) => state.accountList);
	const latestTransactions = useSelector((state) => state.latestTransactions);
	const { currency: displayCurrency, exchangeRate, latestTransactionsSortBy = 'date' } = useSelector((state) => state.settings.general);
	const [anchorEl, setAnchorEl] = useState(null);
	const open = Boolean(anchorEl);
	const dispatch = useDispatch();

	const handleSortClick = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleSortClose = () => {
		setAnchorEl(null);
	};

	const handleSortMenuItemClick = (newSortBy) => {
		if (newSortBy) {
			dispatch(updateGeneralAction('latestTransactionsSortBy', newSortBy));
		}
		handleSortClose();
	};

	const updatedTransactions = useMemo(() => {
		const transactionsWithCurrency = updateTransactionsWithAccounts(latestTransactions, accountList);
		if (!transactionsWithCurrency.length) return [];

		const list = [...transactionsWithCurrency];
		const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate > 0) ? exchangeRate : 1;

		const convertToDisplayCurrency = (item) => {
			const value = item.amount;
			const itemCurrency = item.currency || 'KRW';

			if (itemCurrency === displayCurrency) return value;
			if (itemCurrency === 'KRW') return value / validExchangeRate;
			return value * validExchangeRate;
		};

		return list.sort((a, b) => {
			if (latestTransactionsSortBy === 'amount') return Math.abs(convertToDisplayCurrency(b)) - Math.abs(convertToDisplayCurrency(a));
			return b.date.localeCompare(a.date);
		});
	}, [accountList, latestTransactions, latestTransactionsSortBy, displayCurrency, exchangeRate]);

	const onRowSelect = (index) => () => {
		const transaction = updatedTransactions[index];

		dispatch(openTransactionInModal({
			account: transaction.account,
			date: transaction.date,
			payee: transaction.payee,
			category: transaction.category + (transaction.subcategory ? `:${transaction.subcategory}` : ''),
			amount: transaction.amount,
			memo: transaction.memo,
			isEdit: true,
			index: index
		}));
	};

	return (
		<Box p={1}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, px: 1, pt: 1 }}>
				<Typography variant="subtitle1">Latest Transactions</Typography>
				<div>
					<Button
						id="sort-button"
						aria-controls={open ? 'sort-menu' : undefined}
						aria-haspopup="true"
						aria-expanded={open ? 'true' : undefined}
						onClick={handleSortClick}
						size="small"
						startIcon={<SortIcon />}
						sx={{ textTransform: 'none' }}
					>
						{latestTransactionsSortBy.charAt(0).toUpperCase() + latestTransactionsSortBy.slice(1)}
					</Button>
					<Menu
						id="sort-menu"
						anchorEl={anchorEl}
						open={open}
						onClose={handleSortClose}
						MenuListProps={{ 'aria-labelledby': 'sort-button' }}>
						<MenuItem onClick={() => handleSortMenuItemClick('date')} selected={'date' === latestTransactionsSortBy}>Date</MenuItem>
						<MenuItem onClick={() => handleSortMenuItemClick('amount')} selected={'amount' === latestTransactionsSortBy}>Amount</MenuItem>
					</Menu>
				</div>
			</Stack>
			{updatedTransactions && updatedTransactions.map((row, index) => {
				const IconComponent = TYPE_ICON_MAP[row.type];

				return (
					<Stack
						key={index}
						direction="row"
						justifyContent="space-between"
						alignItems="center"
						onClick={onRowSelect(index)}
						sx={{ cursor: 'pointer', p: 1, borderRadius: 1, '&:hover': { backgroundColor: 'action.hover' } }}
					>
						<Stack direction="row" alignItems="center" spacing={1}>
							<CategoryIcon category={row.category} fontsize={20}/>
							<Box>
								<Payee category={row.category} value={row.payee} />
								<Stack direction="row" justifyContent="left" alignItems="center" spacing={0.5}>
									{IconComponent && <IconComponent sx={{ fontSize: 12 }} />}
									<Typography variant="caption">{row.account}</Typography>
								</Stack>
							</Box>
						</Stack>
						<Stack alignItems="flex-end">
							<Amount value={row.amount} currency={row.currency} showSymbol/>
							<Typography variant="caption" sx={{ color: 'grey.500' }}>
								{moment(row.date).format('MM-DD')}
							</Typography>
						</Stack>
					</Stack>
				);
			})}
			<BankTransactionModal
				isEdit={true}
				transactions={latestTransactions}
			/>
		</Box>
	);
}

export default LatestTransactions;
