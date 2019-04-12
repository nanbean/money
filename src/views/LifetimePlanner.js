import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import TitleHeader from '../components/TitleHeader';

import { getLifetimeFlowAction } from '../actions/lifetimePlannerActions';
import { toCurrencyFormat } from '../utils/formatting';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing.unit * 3,
		[theme.breakpoints.down('sm')]: {
			padding: 0
		}
	}
});

class LifetimePlanner extends Component {
	componentDidMount () {
		this.props.getLifetimeFlowAction();
	}

	formatter (data) {
		return toCurrencyFormat(data);
	}

	render () {
		const { classes, lifetimePlannerFlow } = this.props;

		return (
			<div>
				<TitleHeader title="Lifetime Planner" />
				<div className={classes.container}>
					{
						lifetimePlannerFlow.length > 1 &&
						<ResponsiveContainer width="100%" height={400}>
							<BarChart
								data={lifetimePlannerFlow}
								margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
							>
								<XAxis dataKey="year"/>
								<YAxis hide/>
								<CartesianGrid strokeDasharray="3 3"/>
								<Tooltip formatter={this.formatter} />
								<Bar dataKey="amountInflation" name="Amount(Inflation)" fill="#8884d8" />
								<Bar dataKey="amount" name="Amount" fill="#82ca9d" />
							</BarChart>
						</ResponsiveContainer>
					}
				</div>
			</div>
		);
	}
}

LifetimePlanner.propTypes = {
	classes: PropTypes.object.isRequired,
	getLifetimeFlowAction: PropTypes.func.isRequired,
	lifetimePlannerFlow:  PropTypes.array.isRequired
};

const mapStateToProps = state => ({
	lifetimePlannerFlow: state.lifetimePlannerFlow
});

const mapDispatchToProps = dispatch => ({
	getLifetimeFlowAction () {
		dispatch(getLifetimeFlowAction());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(LifetimePlanner));
