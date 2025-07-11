import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip } from 'recharts';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';
import SortMenuButton from '../components/SortMenuButton';

import {
	updateGeneralAction
} from '../actions/couchdbSettingActions';
import { getLifetimeFlowAction } from '../actions/couchdbReportActions';
import { toCurrencyFormat } from '../utils/formatting';

const CustomTooltip = ({ active, payload }) => {
	if (active && payload && payload.length) {
		const amountData = payload.find(p => p.dataKey === 'amount');
		const amountInflationData = payload.find(p => p.dataKey === 'amountInflation');

		return (
			<Stack
				sx={(theme) => ({
					padding: '5px',
					border: '1px solid rgba(34,36,38,.1)',
					borderRadius: '.28571429rem',
					backgroundColor: theme.palette.secondary.main
				})}
			>
				{amountData &&
					<Typography
						variant="body1"
						gutterBottom
						sx={() => ({
							color: '#e48274'
						})}
					>
						{`Amount(Inflation) : ${toCurrencyFormat(amountData.value)}`}
					</Typography>
				}
				{amountInflationData &&
					<Typography
						variant="body1"
						gutterBottom
						sx={() => ({
							color: '#b04333'
						})}
					>
						{`Amount : ${toCurrencyFormat(amountInflationData.value)}`}
					</Typography>}
			</Stack>
		);
	}
	return null;
};

CustomTooltip.propTypes = {
	active: PropTypes.bool,
	payload: PropTypes.array
};

function LifetimePlanner () {
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
			<div>
				<TitleHeader title="Lifetime Planner" />
				<Container>
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
						<ResponsiveContainer width="100%" height={400}>
							<ComposedChart
								data={lifetimePlannerFlowWithCurrency}
								margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
							>
								<XAxis dataKey="year" />
								<YAxis hide />
								<Tooltip content={<CustomTooltip />} />
								{(lifetimePlannerChartType === 'withInflation' || lifetimePlannerChartType === 'both') && <Bar dataKey="amount" name="Amount(Inflation)" fill="#e48274" />}
								{lifetimePlannerChartType === 'withoutInflation' && <Bar dataKey="amountInflation" name="Amount" fill="#b04333" />}
								{lifetimePlannerChartType === 'both' && <Line dataKey="amountInflation" name="Amount" stroke="#b04333" strokeDasharray="5 5"/>}
							</ComposedChart>
						</ResponsiveContainer>
					}
				</Container>
			</div>
		);
	} else {
		return (
			<TitleHeader title="Lifetime Planner" loading />
		);
	}
}

export default LifetimePlanner;
