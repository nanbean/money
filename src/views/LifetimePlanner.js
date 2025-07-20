import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip } from 'recharts';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

import Layout from '../components/Layout';
import SortMenuButton from '../components/SortMenuButton';

import {
	updateGeneralAction
} from '../actions/couchdbSettingActions';
import { getLifetimeFlowAction } from '../actions/couchdbReportActions';
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

function LifetimePlanner () {
	const theme = useTheme();
	const lifetimePlannerFlow = useSelector((state) => state.lifetimePlannerFlow);
	const { currency: displayCurrency, exchangeRate, lifetimePlannerChartType = 'both' } = useSelector((state) => state.settings);
	const lifetimePlannerFlowWithCurrency = lifetimePlannerFlow.map(item => ({
		...item,
		amount: displayCurrency === 'USD' ? item.amount / exchangeRate:item.amount,
		amountInflation: displayCurrency === 'USD' ? item.amountInflation / exchangeRate:item.amountInflation
	}));

	const dispatch = useDispatch();

	const handleChartTypeChange = (newType) => {
		dispatch(updateGeneralAction('lifetimePlannerChartType', newType));
	};

	useEffect(() => {
		dispatch(getLifetimeFlowAction());
	}, [dispatch]);

	if (lifetimePlannerFlowWithCurrency.length > 0) {
		return (
			<Layout title="Lifetime Planner">
				<Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
					<SortMenuButton
						value={lifetimePlannerChartType}
						onChange={handleChartTypeChange}
						options={[
							{ value: 'both', label: 'Both' },
							{ value: 'withInflation', label: 'With Inflation' },
							{ value: 'withoutInflation', label: 'Without Inflation' }
						]}
					/>
				</Stack>
				{
					lifetimePlannerFlowWithCurrency.length > 1 &&
						<Box sx={{ flex: 1, width: '100%', maxHeight: 400, mx: 'auto' }}>
							<ResponsiveContainer width="100%" height="100%">
								<ComposedChart
									data={lifetimePlannerFlowWithCurrency}
									margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
								>
									<XAxis dataKey="year" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
									<YAxis hide />
									<Tooltip content={<CustomTooltip />} />
									{(lifetimePlannerChartType === 'withInflation' || lifetimePlannerChartType === 'both') && <Bar dataKey="amount" name="Amount(Inflation)" fill={theme.palette.success.main} radius={[4, 4, 0, 0]} />}
									{lifetimePlannerChartType === 'withoutInflation' && <Bar dataKey="amountInflation" name="Amount" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />}
									{lifetimePlannerChartType === 'both' && <Line dataKey="amountInflation" name="Amount" stroke={theme.palette.primary.main} strokeDasharray="5 5" />}
								</ComposedChart>
							</ResponsiveContainer>
						</Box>
				}
			</Layout>
		);
	} else {
		return (
			<Layout title="Lifetime Planner" loading />
		);
	}
}

export default LifetimePlanner;
