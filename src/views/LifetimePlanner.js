import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import TitleHeader from '../components/TitleHeader';

import { getLifetimeFlowAction } from '../actions/lifetimePlannerActions';
import { toCurrencyFormat } from '../utils/formatting';

class LifetimePlanner extends Component {
	componentWillMount () {
		this.props.getLifetimeFlowAction();
	}

	formatter (data) {
		return toCurrencyFormat(data);
	}

	render () {
		const { lifetimePlannerFlow } = this.props;

		return (
			<div>
				<TitleHeader title='Lifetime Planner' />
				<div className='container-full-page'>
					{
						lifetimePlannerFlow.length > 1 &&
						<ResponsiveContainer width='100%' height={400}>
							<BarChart
								data={lifetimePlannerFlow}
								margin={{top: 5, right: 10, left: 20, bottom: 5}}
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
	lifetimePlannerFlow:  PropTypes.array.isRequired,
	getLifetimeFlowAction: PropTypes.func.isRequired
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
)(LifetimePlanner);
