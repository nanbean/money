import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import moment from 'moment';
import _ from 'lodash';

import NormalGrid from '../../components/NormalGrid';
import AccountFilter from '../../components/AccountFilter';

import useT from '../../hooks/useT';
import { sDisplay, labelStyle, fmtCurrency } from '../../utils/designTokens';

import { YEAR_LIST } from '../../constants';

const CustomTooltip = ({ active, payload, label, T }) => {
	if (active && payload && payload.length) {
		return (
			<Box sx={{
				background: T.surf,
				padding: 1,
				border: `1px solid ${T.rule}`,
				borderRadius: '8px',
				minWidth: 150,
				boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
			}}>
				<Typography sx={{ fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 0.5 }}>{label}</Typography>
				{payload.map(entry => (
					<Stack key={entry.dataKey} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Box sx={{ width: 10, height: 10, background: entry.color, borderRadius: '2px' }} />
							<Typography sx={{ fontSize: 11, color: T.ink2 }}>{entry.name}</Typography>
						</Stack>
						<Typography sx={{ fontSize: 11, color: T.ink }}>{fmtCurrency(entry.value, 'KRW')}</Typography>
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
	payload: PropTypes.array,
	T: PropTypes.object
};

export function Dividend () {
	const T = useT();
	const lab = labelStyle(T);

	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const [year, setYear] = useState(parseInt(moment().format('YYYY'), 10));

	const onYearChange = event => setYear(event.target.value);

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
			return { year, dividend: gross };
		});
	}, [allAccountsTransactions]);

	const onBarClick = (data) => {
		if (data && data.activeLabel) setYear(parseInt(data.activeLabel, 10));
	};

	const allAccounts = useMemo(
		() => Object.keys(_.groupBy(dividendTransactions, 'account')).map(account => account),
		[dividendTransactions]
	);
	const [filteredAccounts, setFilteredAccounts] = useState(allAccounts);

	useEffect(() => {
		setFilteredAccounts(allAccounts);
	}, [allAccounts, year]);

	const onFilteredAccountsChange = (e) => setFilteredAccounts(e);

	const dividendData = [];
	_.forEach(_.groupBy(dividendTransactions.filter(i => filteredAccounts.includes(i.account)), 'account'), (value, key) => {
		dividendData.push([
			{ type: 'label', value: key },
			{ type: 'currency', value: value.filter(i => i.activity === 'Div').map(l => l.amount).reduce((p, c) => p + c, 0) },
			{ type: 'noColorCurrency', value: value.filter(i => i.activity === 'MiscExp').map(l => l.amount).reduce((p, c) => p + c, 0) },
			{ type: 'currency', value: (
				value.filter(i => i.activity === 'Div').map(l => l.amount).reduce((p, c) => p + c, 0) -
				value.filter(i => i.activity === 'MiscExp').map(l => l.amount).reduce((p, c) => p + c, 0)
			) }
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
			{ type: 'currency', value: dividendData.map(i => i[1].value).reduce((p, c) => p + c, 0) },
			{ type: 'noColorCurrency', value: dividendData.map(i => i[2].value).reduce((p, c) => p + c, 0) },
			{ type: 'currency', value: dividendData.map(i => i[3].value).reduce((p, c) => p + c, 0) }
		]
	];

	const panelSx = {
		background: T.surf,
		border: `1px solid ${T.rule}`,
		borderRadius: '16px',
		padding: { xs: '14px', md: '18px' },
		color: T.ink
	};

	const yearSelectSx = {
		minWidth: 140,
		'& .MuiOutlinedInput-root': {
			background: T.bg,
			borderRadius: '8px',
			fontSize: 13,
			color: T.ink,
			height: 36
		},
		'& .MuiOutlinedInput-notchedOutline': { borderColor: T.rule },
		'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.acc.hero },
		'& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.acc.hero }
	};

	return (
		<Stack spacing={2}>
			{/* Yearly bar chart panel */}
			<Box sx={panelSx}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 1.5 }}>
					<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 }}>
						Dividends by year
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 연도별 배당</Box>
					</Typography>
					<Typography sx={{ fontSize: 11, color: T.ink3 }}>Click a bar to switch year</Typography>
				</Stack>
				<Box sx={{ width: '100%', height: { xs: 200, md: 220 } }}>
					<ResponsiveContainer>
						<BarChart data={yearlyDividendData} onClick={onBarClick} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
							<CartesianGrid vertical={false} stroke={T.rule} />
							<XAxis dataKey="year" tick={{ fontSize: 12, fill: T.ink2 }} axisLine={{ stroke: T.rule }} tickLine={false} />
							<YAxis hide />
							<Tooltip content={<CustomTooltip T={T} />} cursor={{ fill: T.surf2 }} />
							<Bar dataKey="dividend" name="Dividend" fill={T.acc.hero} radius={[4, 4, 0, 0]} cursor="pointer" />
						</BarChart>
					</ResponsiveContainer>
				</Box>
			</Box>

			{/* Year breakdown panel */}
			<Box sx={panelSx}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1, marginBottom: 1.5 }}>
					<Stack direction="row" alignItems="center" spacing={1.5}>
						<Typography sx={lab}>Year</Typography>
						<FormControl size="small" sx={yearSelectSx}>
							<Select
								value={year}
								onChange={onYearChange}
								MenuProps={{
									PaperProps: { sx: { background: T.surf, color: T.ink, border: `1px solid ${T.rule}` } }
								}}
							>
								{YEAR_LIST.map(i => (
									<MenuItem key={i.key} value={i.value}>{i.text}</MenuItem>
								))}
							</Select>
						</FormControl>
					</Stack>
					<AccountFilter
						allAccounts={allAccounts}
						filteredAccounts={filteredAccounts}
						setfilteredAccounts={onFilteredAccountsChange}
					/>
				</Stack>
				<NormalGrid gridData={dividendGridata} />
			</Box>
		</Stack>
	);
}

export default Dividend;
