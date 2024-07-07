import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip } from 'recharts';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';
import RangeToggle from '../components/RangeToggle';

import {
	getNetWorthFlowAction
} from '../actions/couchdbActions';
import { toCurrencyFormat } from '../utils/formatting';

const CustomTooltip = ({ active, payload, label }) => {
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
				<Typography variant="subtitle1" gutterBottom>
					{`${label.substring(0, 7)}`}
				</Typography>
				<Typography
					variant="body1"
					gutterBottom
					sx={() => ({
						color: '#82281b'
					})}
				>
					{`Net Worth : ${toCurrencyFormat(payload[3].value)}`}
				</Typography>
				<Typography
					variant="body1"
					gutterBottom
					sx={() => ({
						color: '#e48274'
					})}
				>
					{`Cash Asset : ${toCurrencyFormat(payload[2].value)}`}
				</Typography>
				<Typography
					variant="body1"
					gutterBottom
					sx={() => ({
						color: '#b5665b'
					})}
				>
					{`Investement Asset : ${toCurrencyFormat(payload[1].value)}`}
				</Typography>
				<Typography
					variant="body1"
					gutterBottom
					sx={() => ({
						color: '#b04333'
					})}
				>
					{`Real Estate : ${toCurrencyFormat(payload[0].value)}`}
				</Typography>
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

function NetWorth () {
	const netWorthFlow = useSelector((state) => state.netWorthFlow);
	const [range, setRange] = useState('monthly');
	const rangedNetWorthFlow = useMemo(() => netWorthFlow.filter(item => {
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear();
		const currentMonth = currentDate.getMonth() + 1;

		if (range === 'yearly') {
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
	}).map(item => ({ ...item, date: range === 'yearly' ? item.date.substring(0,4):item.date.substring(0,7) })), [netWorthFlow, range]);
	const dispatch = useDispatch();

	const handleRangeChange = (event, newRange) => {
		setRange(newRange);
	};

	useEffect(() => {
		dispatch(getNetWorthFlowAction());
	}, [dispatch]);

	if (rangedNetWorthFlow.length > 0) {
		return (
			<div>
				<TitleHeader title="Net Worth" />
				<RangeToggle range={range} onRangeChange={handleRangeChange} />
				<Container>
					{
						rangedNetWorthFlow.length > 1 &&
						<ResponsiveContainer width="100%" height={400}>
							<ComposedChart
								data={rangedNetWorthFlow}
								margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
							>
								<XAxis dataKey="date"/>
								<YAxis hide/>
								<Tooltip content={<CustomTooltip />} />
								<Bar dataKey="assetNetWorth" stackId="a" fill="#b04333" />
								<Bar dataKey="investmentsNetWorth" stackId="a" fill="#b5665b" />
								<Bar dataKey="cashNetWorth" stackId="a" fill="#e48274" />
								<Line dataKey="netWorth" stroke="#82281b" strokeDasharray="5 5"/>
							</ComposedChart>
						</ResponsiveContainer>
					}
				</Container>
			</div>
		);
	} else {
		return (
			<TitleHeader title="Net Worth" loading />
		);
	}
}

export default NetWorth;
