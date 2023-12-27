import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

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
			key,
			value.filter(i => i.activity === 'Div').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ),
			value.filter(i => i.activity === 'MiscExp').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ),
			(value.filter(i => i.activity === 'Div').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ) -
			value.filter(i => i.activity === 'MiscExp').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ))
		]);
	});

	const dividendGridata = [
		[
			'Account',
			'Dividend',
			'Tax',
			'Gain'
		],
		...dividendData,
		[
			'Total',
			dividendData.map(i => i[1]).reduce( (prev, curr) => prev + curr, 0 ),
			dividendData.map(i => i[2]).reduce( (prev, curr) => prev + curr, 0 ),
			dividendData.map(i => i[3]).reduce( (prev, curr) => prev + curr, 0 )
		]
	];

	return (
		<div>
			<div>
				<FormControl fullWidth variant="standard">
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
			</div>
			<NormalGrid
				gridData={dividendGridata}
			/>
		</div>
	);
}

export default Dividend;
