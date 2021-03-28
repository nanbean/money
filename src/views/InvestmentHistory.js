import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import LinearProgress from '@material-ui/core/LinearProgress';
import stc from 'string-to-color';

import InvestmentFilter from '../components/InvestmentFilter';
import TitleHeader from '../components/TitleHeader';

import {
	setfilteredInvestments
} from '../actions/investmentActions';

import {
	getNetWorthFlowAction
} from '../actions/couchdbActions';

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
				{
					payload.map(i => (
						<div key={i.dataKey} style={{ ...toolTipStyles.item }} >{`${i.dataKey} : ${i.value}`}</div>
					))
				}
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

function InvestmentHistory ({
	allAccountsTransactions,
	allInvestmentsPrice,
	classes,
	filteredInvestments,
	getNetWorthFlowAction,
	netWorthFlow,
	setfilteredInvestments
}) {
	const allInvestments = useMemo(() => allInvestmentsPrice.filter(i => allAccountsTransactions.find(j => j.investment === i.name)), [allAccountsTransactions, allInvestmentsPrice]);
	const investmentHistory = useMemo(() => netWorthFlow.map(i => {
		const item = {
			date: i.date
		}
		filteredInvestments.forEach(j => {
			if (i.netInvestments.length > 0) {
				item[j] = i.netInvestments.filter(k => k.name === j).reduce((sum, l) => sum + l.quantity, 0)
			}
		});

		return item;
	}), [netWorthFlow, filteredInvestments]);

	useEffect(() => {
		getNetWorthFlowAction();
	}, []);

	if (netWorthFlow.length > 0) {
		return (
			<div>
				<TitleHeader title="Net Worth" />
				<div className={classes.container}>
					<InvestmentFilter
						allInvestmentsPrice={allInvestments}
						filteredInvestments={filteredInvestments}
						setfilteredInvestments={setfilteredInvestments}
					/>
					{
						netWorthFlow.length > 1 &&
						<ResponsiveContainer width="100%" height={400}>
							<BarChart
								data={investmentHistory}
								margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
							>
								<XAxis dataKey="date"/>
								<YAxis hide/>
								<CartesianGrid strokeDasharray="3 3"/>
								<Tooltip content={<CustomTooltip />} />
								{
									filteredInvestments.map(i => (
										<Bar key={i} dataKey={i} stackId="a" fill={stc(i)} />
									))
								}
							</BarChart>
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

InvestmentHistory.propTypes = {
	allAccountsTransactions: PropTypes.array.isRequired,
	allInvestmentsPrice: PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
	filteredInvestments: PropTypes.array.isRequired,
	getNetWorthFlowAction: PropTypes.func.isRequired,
	netWorthFlow:  PropTypes.array.isRequired
};

const mapStateToProps = state => ({
	allAccountsTransactions: state.allAccountsTransactions,
	allInvestmentsPrice: state.allInvestmentsPrice,
	filteredInvestments: state.filteredInvestments,
	netWorthFlow: state.netWorthFlow
});

const mapDispatchToProps = dispatch => ({
	getNetWorthFlowAction () {
		dispatch(getNetWorthFlowAction());
	},
	setfilteredInvestments (params) {
		dispatch(setfilteredInvestments(params));
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(InvestmentHistory));
