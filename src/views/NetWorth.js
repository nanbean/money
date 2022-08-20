import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import LinearProgress from '@mui/material/LinearProgress';

import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';

import {
	getNetWorthFlowAction
} from '../actions/couchdbActions';
import { toCurrencyFormat } from '../utils/formatting';

import toolTipStyles from '../assets/jss/components/toolTip.js';

const CustomTooltip = ({ active, payload, label }) => {
	if (active) {
		return (
			<div style={{ ...toolTipStyles.root }} >
				<div style={{ ...toolTipStyles.label }} >{`${label.substring(0, 7)}`}</div>
				<div style={{ ...toolTipStyles.item }} >{`Net Worth : ${toCurrencyFormat(payload[0].value + payload[1].value)}`}</div>
				<div style={{ ...toolTipStyles.item }} >{`Movable Asset : ${toCurrencyFormat(payload[1].value)}`}</div>
				<div style={{ ...toolTipStyles.item }} >{`Real Estate : ${toCurrencyFormat(payload[0].value)}`}</div>
			</div>
		);
	}

	return null;
};

CustomTooltip.propTypes = {
	active: PropTypes.bool.isRequired,
	label: PropTypes.string.isRequired,
	payload: PropTypes.string.isRequired
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
