import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';

import moment from 'moment';
import _ from 'lodash';

import NormalGrid from '../../components/NormalGrid';
import AccountFilter from '../../components/AccountFilter';
import { toCurrencyFormat } from '../../utils/formatting';

import {
	YEAR_LIST
} from '../../constants';

const CustomTooltip = ({ active, payload, label }) => {
	if (active && payload && payload.length) {
		return (
			<Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, minWidth: 150, boxShadow: 3 }}>
				<Typography variant="subtitle2" gutterBottom>{label}</Typography>
				{payload.map(entry => (
					<Stack key={entry.dataKey} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Box sx={{ width: 10, height: 10, bgcolor: entry.color, borderRadius: '2px' }} />
							<Typography variant="caption">{entry.name}</Typography>
						</Stack>
						<Typography variant="caption">{toCurrencyFormat(entry.value)}</Typography>
					</Stack>
				))}
			</Box>
		);
	}
	return null;
};

CustomTooltip.propTypes = {
	active: PropTypes.bool,
	label: PropTypes.string,
	payload: PropTypes.array
};

export function Dividend () {
	const theme = useTheme();
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const [year, setYear] = useState(parseInt(moment().format('YYYY'), 10));

	const onYearChange = event => {
		setYear(event.target.value);
	};

	const dividendTransactions = useMemo(() => {
		const startDate = moment().year(year).startOf('year').format('YYYY-MM-DD');
		const endDate = moment().year(year).endOf('year').format('YYYY-MM-DD');
		const transactions = allAccountsTransactions.filter(i => i.activity === 'Div' || i.activity === 'MiscExp')
			.filter(i => i.date >= startDate && i.date <= endDate);

		const accountsWithDiv = new Set(transactions.filter(t => t.activity === 'Div').map(t => t.account));
		return transactions.filter(t => accountsWithDiv.has(t.account));
	}, [allAccountsTransactions, year]);

	const yearlyDividendData = useMemo(() => {
		const dividends = allAccountsTransactions.filter(i => i.activity === 'Div');
		const groupedByYear = _.groupBy(dividends, (i) => moment(i.date).format('YYYY'));
		const years = Object.keys(groupedByYear).sort();

		return years.map(year => {
			const txs = groupedByYear[year];
			const gross = txs.reduce((acc, curr) => acc + curr.amount, 0);
			return {
				year,
				dividend: gross
			};
		});
	}, [allAccountsTransactions]);

	const onBarClick = (data) => {
		if (data && data.activeLabel) {
			setYear(parseInt(data.activeLabel, 10));
		}
	};

	const allAccounts = useMemo(() => Object.keys(_.groupBy(dividendTransactions, 'account')).map(account => account), [dividendTransactions]);
	const [filteredAccounts, setFilteredAccounts] = useState(allAccounts);

	useEffect(() => {
		setFilteredAccounts(allAccounts);
	}, [allAccounts, year]);

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
			<Box sx={{ width: '100%', height: '150px', mb: 2 }}>
				<ResponsiveContainer>
					<BarChart data={yearlyDividendData} onClick={onBarClick}>
						<XAxis dataKey="year" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
						<YAxis hide />
						<Tooltip content={<CustomTooltip />} />
						<Bar dataKey="dividend" name="Dividend" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} cursor="pointer" />
					</BarChart>
				</ResponsiveContainer>
			</Box>
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
