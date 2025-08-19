import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip } from 'recharts';

import { useTheme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

import Layout from '../components/Layout';
import SortMenuButton from '../components/SortMenuButton';
import {
	updateGeneralAction
} from '../actions/couchdbSettingActions';
import {
	getNetWorthFlowAction
} from '../actions/couchdbReportActions';

import { toCurrencyFormat } from '../utils/formatting';

const CustomTooltip = ({ active, payload, label }) => {
	if (active && payload && payload.length) {
		return (
			<Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, minWidth: 150, boxShadow: 3 }}>
				<Typography variant="subtitle2" gutterBottom>{label}</Typography>
				{payload.sort((a, b) => b.value - a.value).map(entry => (
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

function NetWorth () {
	const theme = useTheme();
	const netWorthFlow = useSelector((state) => state.netWorthFlow);
	const { currency: displayCurrency, exchangeRate, netWorthChartRange = 'monthly' } = useSelector((state) => state.settings);
	const rangedNetWorthFlow = useMemo(() => netWorthFlow.filter(item => {
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear();
		const currentMonth = currentDate.getMonth() + 1;
		if (netWorthChartRange === 'yearly') {
			const date = new Date(item.date);
			const month = date.getMonth() + 1;
			const year = date.getFullYear();
			if (year !== currentYear) {
				return month === 12;
			} else {
				return year === currentYear && month === currentMonth;
			}
		}
		return true;
	}).map(item => ({ ...item, date: netWorthChartRange === 'yearly' ? item.date.substring(0,4):item.date.substring(0,7) })).map(item => ({
		...item,
		assetNetWorth: displayCurrency === 'USD' ? item.assetNetWorth / exchangeRate:item.assetNetWorth,
		investmentsNetWorth: displayCurrency === 'USD' ? item.investmentsNetWorth / exchangeRate:item.investmentsNetWorth,
		cashNetWorth: displayCurrency === 'USD' ? item.cashNetWorth / exchangeRate:item.cashNetWorth,
		netWorth: displayCurrency === 'USD' ? item.netWorth / exchangeRate:item.netWorth
	})), [netWorthFlow, netWorthChartRange, displayCurrency, exchangeRate]);
	const dispatch = useDispatch();

	const handleRangeChange = (newRange) => {
		dispatch(updateGeneralAction('netWorthChartRange', newRange));
	};

	useEffect(() => {
		dispatch(getNetWorthFlowAction());
	}, [dispatch]);

	if (rangedNetWorthFlow.length > 0) {
		return (
			<Layout title="Net Worth">
				<Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
					<SortMenuButton
						value={netWorthChartRange}
						onChange={handleRangeChange}
						options={[
							{ value: 'monthly', label: 'Monthly' },
							{ value: 'yearly', label: 'Yearly' }
						]}
					/>
				</Stack>
				{
					rangedNetWorthFlow.length > 1 &&
						<Box sx={{ flex: 1, width: '100%', maxHeight: 400, mx: 'auto' }}>
							<ResponsiveContainer width="100%" height="100%">
								<ComposedChart
									data={rangedNetWorthFlow}
									margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
								>
									<XAxis dataKey="date" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
									<YAxis hide/>
									<Tooltip content={<CustomTooltip />} />
									<Bar dataKey="assetNetWorth" name="Real Estate" stackId="a" fill={theme.palette.success.main} radius={[4, 4, 4, 4]} />
									<Bar dataKey="investmentsNetWorth" name="Investment Asset" stackId="a" fill={theme.palette.info.main} radius={[4, 4, 4, 4]} />
									<Bar dataKey="cashNetWorth" name="Cash Asset" stackId="a" fill={theme.palette.warning.main} radius={[4, 4, 4, 4]} />
									<Line dataKey="netWorth" name="Net Worth" stroke={theme.palette.text.primary} strokeDasharray="5 5"/>
								</ComposedChart>
							</ResponsiveContainer>
						</Box>
				}
			</Layout>
		);
	} else {
		return (
			<Layout title="Net Worth" loading />
		);
	}
}

export default NetWorth;
