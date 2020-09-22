import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import LinearProgress from '@material-ui/core/LinearProgress';

import TitleHeader from '../components/TitleHeader';

import {
	getNetWorthFlowAction
} from '../actions/couchdbActions';
import { toCurrencyFormat } from '../utils/formatting';

import toolTipStyles from '../assets/jss/components/toolTip.js';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing(3),
		[theme.breakpoints.down('sm')]: {
			padding: 0
		}
	},
	progress: {
		zIndex: theme.zIndex.drawer + 2,
		position: 'sticky',
		top: 64,
		[theme.breakpoints.down('sm')]: {
			top: 56
		}
	}
});

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
	payload:  PropTypes.array.isRequired
};

function NetWorth ({
	classes,
	getNetWorthFlowAction,
	netWorthFlow
}) {
	useEffect(() => {
		getNetWorthFlowAction();
	}, []);

	if (netWorthFlow.length > 0) {
		return (
			<div>
				<TitleHeader title="Net Worth" />
				<div className={classes.container}>
					{
						netWorthFlow.length > 1 &&
						<ResponsiveContainer width="100%" height={400}>
							<ComposedChart
								data={netWorthFlow}
								margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
							>
								<XAxis dataKey="date"/>
								<YAxis hide/>
								<CartesianGrid strokeDasharray="3 3"/>
								<Tooltip content={<CustomTooltip />} />
								<Bar dataKey="assetNetWorth" stackId="a" fill="#3d397d" />
								<Bar dataKey="movableAsset" stackId="a" fill="#8884d8" />
							</ComposedChart>
						</ResponsiveContainer>
					}
				</div>
			</div>
		);
	} else {
		return (
			<div>
				<TitleHeader title="Net Worth" />
				<LinearProgress color="secondary" className={classes.progress} />
			</div>
		);
	}
}

NetWorth.propTypes = {
	classes: PropTypes.object.isRequired,
	getNetWorthFlowAction: PropTypes.func.isRequired,
	netWorthFlow:  PropTypes.array.isRequired
};

const mapStateToProps = state => ({
	netWorthFlow: state.netWorthFlow
});

const mapDispatchToProps = dispatch => ({
	getNetWorthFlowAction () {
		dispatch(getNetWorthFlowAction());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(NetWorth));
