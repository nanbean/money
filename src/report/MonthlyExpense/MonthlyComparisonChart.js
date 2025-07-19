import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ResponsiveContainer, ComposedChart, Bar, XAxis, Tooltip } from 'recharts';

import { useTheme } from '@mui/material/styles';
import { toCurrencyFormat } from '../../utils/formatting';

import {
	POSITIVE_AMOUNT_LIGHT_COLOR,
	POSITIVE_AMOUNT_DARK_COLOR,
	NEGATIVE_AMOUNT_COLOR
} from '../../constants';

const CustomTooltip = ({ active, payload, label }) => {
	if (active && payload && payload.length) {
		return (
			<Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, minWidth: 150, boxShadow: 3 }}>
				<Typography variant="subtitle2" gutterBottom>{label}</Typography>
				{payload.sort((a, b) => b.value - a.value).map(entry => (
					<Stack key={entry.dataKey} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Box sx={{ width: 10, height: 10, bgcolor: entry.fill, borderRadius: '2px' }} />
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

const MonthlyComparisonChart = ({ chartData }) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const { currency: displayCurrency, exchangeRate } = useSelector((state) => state.settings);
	const dataWithCurrency = useMemo(() => {
		if (displayCurrency === 'USD') {
			return chartData.map(item => ({
				...item,
				income: item.income / exchangeRate,
				expense: item.expense / exchangeRate
			}));
		}
		return chartData;
	}, [chartData, displayCurrency, exchangeRate]);

	return (
		<ResponsiveContainer width="100%" height={150}>
			<ComposedChart data={dataWithCurrency} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
				<XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
				<Tooltip content={<CustomTooltip />} />
				<Bar dataKey="income" fill={isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR} name="Income" radius={[4, 4, 0, 0]} />
				<Bar dataKey="expense" fill={NEGATIVE_AMOUNT_COLOR} name="Expense"  radius={[4, 4, 0, 0]} />
			</ComposedChart>
		</ResponsiveContainer>
	);
};

MonthlyComparisonChart.propTypes = {
	chartData: PropTypes.arrayOf(PropTypes.shape({
		month: PropTypes.string,
		income: PropTypes.number,
		expense: PropTypes.number
	})).isRequired
};

export default MonthlyComparisonChart;