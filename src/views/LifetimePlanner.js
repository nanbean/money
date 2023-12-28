import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';

import { getLifetimeFlowAction } from '../actions/couchdbActions';
import { toCurrencyFormat } from '../utils/formatting';

const CustomTooltip = ({ active, payload }) => {
	if (active) {
		return (
			<Stack
				sx={(theme) => ({
					padding: '5px',
					border: '1px solid rgba(34,36,38,.1)',
					borderRadius: '.28571429rem',
					backgroundColor: theme.palette.secondary.main
				})}
			>
				<Typography variant="body1" gutterBottom>
					{`Amount(Inflation) : ${toCurrencyFormat(payload[0].value)}`}
				</Typography>
				<Typography variant="body1" gutterBottom>
					{`Amount : ${toCurrencyFormat(payload[1].value)}`}
				</Typography>
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

	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(getLifetimeFlowAction());
	}, []);

	if (lifetimePlannerFlow.length > 0) {
		return (
			<div>
				<TitleHeader title="Lifetime Planner" />
				<Container>
					{
						lifetimePlannerFlow.length > 1 &&
						<ResponsiveContainer width="100%" height={400}>
							<BarChart
								data={lifetimePlannerFlow}
								margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
							>
								<XAxis dataKey="year" />
								<YAxis hide />
								<Tooltip content={<CustomTooltip />} />
								<Bar dataKey="amountInflation" name="Amount(Inflation)" fill="#8884d8" />
								<Bar dataKey="amount" name="Amount" fill="#82ca9d" />
							</BarChart>
						</ResponsiveContainer>
					}
				</Container>
			</div>
		);
	} else {
		return (
			<div>
				<TitleHeader title="Lifetime Planner" />
				<LinearProgress
					color="secondary"
					sx={(theme) => ({
						zIndex: theme.zIndex.drawer + 2,
						position: 'sticky',
						top: 64,
						[theme.breakpoints.down('sm')]: {
							top: 56
						}
					})}
				/>

			</div>
		);
	}
}

export default LifetimePlanner;
