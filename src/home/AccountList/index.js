import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import Amount from '../../components/Amount';
import SortMenuButton from '../../components/SortMenuButton';
import Summary from '../Summary';

import {
	updateGeneralAction
} from '../../actions/couchdbSettingActions';

import { TYPE_ICON_MAP, TYPE_NAME_MAP } from '../../constants';

const linkStyle = {
	textDecoration: 'none',
	color: 'inherit'
};

const filterAccountList = accountList => accountList.filter(i => i.closed === false && !i.name.match(/_Cash/i));

const groupAndSummarizeAccounts = (accountList, displayCurrency, exchangeRate, sortBy) => {
	const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate > 0) ? exchangeRate : 1;

	const grouped = accountList.reduce((acc, account) => {
		const { type, currency, balance } = account;
		const accountCurrency = currency || 'KRW';
		const numericBalance = Number(balance) || 0;

		if (!acc[type]) {
			acc[type] = {
				accounts: [],
				total: 0
			};
		}

		acc[type].accounts.push(account);

		let convertedBalance = numericBalance;
		if (accountCurrency !== displayCurrency) {
			// This logic is based on the Amount component.
			// It assumes exchangeRate is for converting between KRW and another primary currency (e.g., USD).
			if (accountCurrency === 'KRW') {
				// We are converting KRW to the other currency (e.g., USD)
				convertedBalance = numericBalance / validExchangeRate;
			} else {
				// We are converting the other currency (e.g., USD) to KRW.
				convertedBalance = numericBalance * validExchangeRate;
			}
		}

		acc[type].total += convertedBalance;
		return acc;
	}, {});

	// Sort accounts within each group by name
	Object.values(grouped).forEach(group => {
		group.accounts.sort((a, b) => {
			if (sortBy === 'balance') {
				const convert = (item) => {
					const numericBalance = Number(item.balance) || 0;
					const accountCurrency = item.currency || 'KRW';
					if (accountCurrency === displayCurrency) return numericBalance;
					if (accountCurrency === 'KRW') return numericBalance / validExchangeRate;
					return numericBalance * validExchangeRate;
				};
				return convert(b) - convert(a);
			}
			return a.name.localeCompare(b.name); // Default sort by name
		});
	});

	return grouped;
};

export default function AccountList () {
	const accountList = useSelector((state) => state.accountList);
	const [expandedRows, setExpandedRows] = useState(new Set());
	const { currency: displayCurrency, exchangeRate, accountListSortBy = 'name' } = useSelector((state) => state.settings);
	const dispatch = useDispatch();

	const handleSortChange = (newSortBy) => {
		dispatch(updateGeneralAction('accountListSortBy', newSortBy));
	};

	const groupedAccounts = useMemo(() => {
		const filtered = filterAccountList(accountList);
		const grouped = groupAndSummarizeAccounts(filtered, displayCurrency, exchangeRate, accountListSortBy);
		// Always sort the groups by name, regardless of the sortBy state for inner items.
		return Object.entries(grouped).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
	}, [accountList, displayCurrency, exchangeRate, accountListSortBy]);

	const handleRowToggle = (type) => {
		const newExpandedRows = new Set(expandedRows);
		if (newExpandedRows.has(type)) {
			newExpandedRows.delete(type);
		} else {
			newExpandedRows.add(type);
		}
		setExpandedRows(newExpandedRows);
	};

	return (
		<Box p={1}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, px: 1, pt: 1 }}>
				<Typography variant="subtitle1">Accounts</Typography>
				<SortMenuButton
					value={accountListSortBy}
					onChange={handleSortChange}
					options={[
						{ value: 'name', label: 'Name' },
						{ value: 'balance', label: 'Balance' }
					]}
				/>
			</Stack>
			<Summary />
			<Box>
				{groupedAccounts.map(([type, data]) => {
					const IconComponent = TYPE_ICON_MAP[type];
					const isExpanded = expandedRows.has(type);
					return (
						<Box key={type} sx={{ my: 0.5 }}>
							<Stack
								direction="row"
								justifyContent="space-between"
								alignItems="center"
								onClick={() => handleRowToggle(type)}
								sx={{ cursor: 'pointer', p: 1, borderRadius: 1, '&:hover': { backgroundColor: 'action.hover' } }}
							>
								<Stack direction="row" justifyContent="left" alignItems="center" spacing={1}>
									<IconButton aria-label="expand row" size="small">
										{isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
									</IconButton>
									{IconComponent && <IconComponent fontSize="small"/>}
									<Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
										{TYPE_NAME_MAP[type]}
									</Typography>
								</Stack>
								<Amount value={data.total} currency={displayCurrency} showSymbol/>
							</Stack>
							<Collapse in={isExpanded} timeout="auto" unmountOnExit>
								<Box sx={{ pl: 4, py: 1 }}>
									{data.accounts.map(row => (
										<Link key={row.name} to={`/${row.type}/${row.name}`} style={linkStyle}>
											<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, borderRadius: 1, '&:hover': { backgroundColor: 'action.hover' } }}>
												<Typography variant="body2" sx={{ pl: 3 }}>{row.name}</Typography>
												<Amount value={row.balance} currency={row.currency} showSymbol/>
											</Stack>
										</Link>
									))}
								</Box>
							</Collapse>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}