import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';

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
				<Typography variant="body1" gutterBottom>
					{`Net Worth : ${toCurrencyFormat(payload[0].value + payload[1].value)}`}
				</Typography>
				<Typography variant="body1" gutterBottom>
					{`Movable Asset : ${toCurrencyFormat(payload[1].value)}`}
				</Typography>
				<Typography variant="body1" gutterBottom>
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

	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(getNetWorthFlowAction());
	}, []);

	if (netWorthFlow.length > 0) {
		return (
			<div>
				<TitleHeader title="Net Worth" />
				<Container>
					{
						netWorthFlow.length > 1 &&
						<ResponsiveContainer width="100%" height={400}>
							<ComposedChart
								data={netWorthFlow}
								margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
							>
								<XAxis dataKey="date"/>
								<YAxis hide/>
								<Tooltip content={<CustomTooltip />} />
								<Bar dataKey="assetNetWorth" stackId="a" fill="#3d397d" />
								<Bar dataKey="movableAsset" stackId="a" fill="#8884d8" />
							</ComposedChart>
						</ResponsiveContainer>
					}
				</Container>
			</div>
		);
	} else {
		return (
			<div>
				<TitleHeader title="Net Worth" />
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

export default NetWorth;
