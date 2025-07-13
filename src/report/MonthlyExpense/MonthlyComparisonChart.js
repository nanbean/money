import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import Stack from '@mui/material/Stack';
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
		const incomeData = payload.find(p => p.dataKey === 'income');
		const expenseData = payload.find(p => p.dataKey === 'expense');

		return (
			<Stack
				sx={(theme) => ({
					padding: '5px',
					border: '1px solid rgba(34,36,38,.1)',
					borderRadius: '.28571429rem',
					backgroundColor: theme.palette.background.paper
				})}
			>
				<Typography variant="subtitle1" gutterBottom>
					{`Month: ${label}`}
				</Typography>
				{incomeData &&
					<Typography
						variant="body1"
						gutterBottom
						sx={{ color: incomeData.fill }}
					>
						{`Income : ${toCurrencyFormat(incomeData.value)}`}
					</Typography>
				}
				{expenseData &&
					<Typography
						variant="body1"
						gutterBottom
						sx={{ color: expenseData.fill }}
					>
						{`Expense : ${toCurrencyFormat(expenseData.value)}`}
					</Typography>}
			</Stack>
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
				<XAxis dataKey="month" />
				<Tooltip content={<CustomTooltip />} />
				<Bar dataKey="income" fill={isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR} name="Income" />
				<Bar dataKey="expense" fill={NEGATIVE_AMOUNT_COLOR} name="Expense" />
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