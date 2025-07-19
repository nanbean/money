import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';

import moment from 'moment';
import _ from 'lodash';

import NormalGrid from '../../components/NormalGrid';
import AccountFilter from '../../components/AccountFilter';

import {
	YEAR_LIST
} from '../../constants';

export function Dividend () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const [year, setYear] = useState(parseInt(moment().format('YYYY'), 10));

	const onYearChange = event => {
		setYear(event.target.value);
	};

	const startDate = moment().year(year).startOf('year').format('YYYY-MM-DD');
	const endDate = moment().year(year).endOf('year').format('YYYY-MM-DD');
	const dividendTransactions = allAccountsTransactions.filter(i => i.activity === 'Div' || i.activity === 'MiscExp')
		.filter(i => i.date >= startDate && i.date <= endDate);
	const allAccounts = Object.keys(_.groupBy(dividendTransactions, 'account')).map(account => account);
	const [filteredAccounts, setFilteredAccounts] = useState(allAccounts);

	const onFilteredAccountsChange = (e) => {
		setFilteredAccounts(e);
	};

	const dividendData = [];
	_.forEach(_.groupBy(dividendTransactions.filter(i => filteredAccounts.includes(i.account)), 'account'), (value, key) => {
		dividendData.push([
			{ type: 'label', value: key },
			{ type: 'currency', value: value.filter(i => i.activity === 'Div').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ) },
			{ type: 'noColorCurrency', value: value.filter(i => i.activity === 'MiscExp').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ) },
			{ type: 'currency', value: (value.filter(i => i.activity === 'Div').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ) -
			value.filter(i => i.activity === 'MiscExp').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 )) }
		]);
	});

	const dividendGridata = [
		[
			{ type: 'label', value: 'Account' },
			{ type: 'label', value: 'Dividend' },
			{ type: 'label', value: 'Tax' },
			{ type: 'label', value: 'Gain' }
		],
		...dividendData,
		[
			{ type: 'label', value: 'Total' },
			{ type: 'currency', value: dividendData.map(i => i[1].value).reduce( (prev, curr) => prev + curr, 0 ) },
			{ type: 'noColorCurrency', value: dividendData.map(i => i[2].value).reduce( (prev, curr) => prev + curr, 0 ) },
			{ type: 'currency', value: dividendData.map(i => i[3].value).reduce( (prev, curr) => prev + curr, 0 ) }
		]
	];

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
				<AccountFilter
					allAccounts={allAccounts}
					filteredAccounts={filteredAccounts}
					setfilteredAccounts={onFilteredAccountsChange}
				/>
			</Stack>
			<NormalGrid
				gridData={dividendGridata}
			/>
		</Box>
	);
}

export default Dividend;
