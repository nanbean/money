import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import SortIcon from '@mui/icons-material/Sort';

import Amount from '../../components/Amount';

import { updateGeneralAction } from '../../actions/couchdbSettingActions';

import useDarkMode from '../../hooks/useDarkMode';
import {
	POSITIVE_AMOUNT_DARK_COLOR,
	POSITIVE_AMOUNT_LIGHT_COLOR,
	NEGATIVE_AMOUNT_COLOR
} from '../../constants';

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
		return: i.purchasedValue !== 0 ? i.profit / i.purchasedValue : 0
	})).filter(({ quantity }) => quantity > 0);
};

export function StockList () {
	const accountList = useSelector((state) => state.accountList);
	const rawStockList = useMemo(() => getInvestmentsFromAccounts(accountList), [accountList]);
	const { exchangeRate } = useSelector((state) => state.settings.general);
	const sortBy = useSelector((state) => state.settings.general.stockListSortBy || 'equity');
	const isDarkMode = useDarkMode();
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
			dispatch(updateGeneralAction('stockListSortBy', newSortBy));
		}
		handleSortClose();
	};

	const stockList = useMemo(() => {
		const list = [...rawStockList];
		const convertToKRW = (item, key) => {
			const value = item[key];
			return item.currency === 'USD' ? value * exchangeRate : value;
		};

		switch (sortBy) {
		case 'quantity':
			return list.sort((a, b) => b.quantity - a.quantity);
		case 'return':
			return list.sort((a, b) => b.return - a.return);
		case 'equity':
		case 'allocation':
		default:
			return list.sort((a, b) => convertToKRW(b, 'appraisedValue') - convertToKRW(a, 'appraisedValue'));
		}
	}, [rawStockList, sortBy, exchangeRate]);

	const { totalProfit, totalPurchasedValue, totalAppraisedValue } = stockList.reduce((totals, investment) => {
		totals.totalProfit += investment.currency === 'USD' ? investment.profit * exchangeRate:investment.profit;
		totals.totalPurchasedValue += investment.currency === 'USD' ? investment.purchasedValue * exchangeRate:investment.purchasedValue;
		totals.totalAppraisedValue += investment.currency === 'USD' ? investment.appraisedValue * exchangeRate:investment.appraisedValue;
		return totals;
	}, { totalProfit: 0, totalPurchasedValue: 0, totalAppraisedValue: 0 });
	const totalReturn = totalPurchasedValue !== 0 ? (totalProfit / totalPurchasedValue * 100) : 0;

	return (
		<Box p={1}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, px: 1, pt: 1 }}>
				<Typography variant="subtitle1">Stock List</Typography>
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
						{sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
					</Button>
					<Menu
						id="sort-menu"
						anchorEl={anchorEl}
						open={open}
						onClose={handleSortClose}
						MenuListProps={{
							'aria-labelledby': 'sort-button'
						}}
					>
						<MenuItem onClick={() => handleSortMenuItemClick('equity')} selected={'equity' === sortBy}>Equity</MenuItem>
						<MenuItem onClick={() => handleSortMenuItemClick('quantity')} selected={'quantity' === sortBy}>Quantity</MenuItem>
						<MenuItem onClick={() => handleSortMenuItemClick('allocation')} selected={'allocation' === sortBy}>Allocation</MenuItem>
						<MenuItem onClick={() => handleSortMenuItemClick('return')} selected={'return' === sortBy}>Return</MenuItem>
					</Menu>
				</div>
			</Stack>
			{stockList.map(i => (
				<Link key={i.name} to={`/performance/${i.name}`} style={linkStyle}>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
						sx={{ p: 1, borderRadius: 1, '&:hover': { backgroundColor: 'action.hover' } }}
					>
						<Box>
							<Typography variant="body2">{i.name}</Typography>
							<Typography variant="caption" sx={{ color: 'grey.500' }}>
								{i.quantity.toLocaleString()}
							</Typography>
						</Box>
						<Stack alignItems="flex-end">
							<Amount value={i.appraisedValue} showSymbol currency={i.currency}/>
							<Stack direction="row" alignItems="baseline" spacing={0.5}>
								<Amount value={Math.round(i.profit)} size="small" negativeColor showSymbol currency={i.currency}/>
								<Typography variant="caption" sx={{ color: i.return > 0 ? (isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR) : NEGATIVE_AMOUNT_COLOR }}>
									({(i.return * 100).toFixed(2)}%)
								</Typography>
							</Stack>
						</Stack>
					</Stack>
				</Link>
			))}
			<Divider sx={{ my: 1 }} />
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1 }}>
				<Typography variant="body2" sx={{ fontWeight: 'bold' }}>Subtotal</Typography>
				<Stack alignItems="flex-end">
					<Amount value={totalAppraisedValue} showSymbol currency="KRW"/>
					<Stack direction="row" alignItems="baseline" spacing={0.5}>
						<Amount value={Math.round(totalProfit)} size="small" negativeColor showSymbol currency="KRW"/>
						<Typography variant="caption" sx={{ color: totalProfit > 0 ? (isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR) : NEGATIVE_AMOUNT_COLOR }}>
							({totalReturn.toFixed(2)}%)
						</Typography>
					</Stack>
				</Stack>
			</Stack>
		</Box>
	);
}

export default StockList;
