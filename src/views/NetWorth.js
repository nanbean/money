import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import TitleHeader from '../components/TitleHeader';

import { getNetWorthAction } from '../actions/netWorthActions';
import { toCurrencyFormat } from '../utils/formatting';

class NetWorth extends Component {
	componentWillMount () {
		this.props.getNetWorthAction();
	}

	formatter (data) {
		return toCurrencyFormat(data);
	}

	render () {
		const { netWorth } = this.props;

		return (
			<div>
				<TitleHeader title='Net Worth' />
				<div className='container-full-page'>
					{
						netWorth.length > 1 &&
						<ResponsiveContainer width='100%' height={400}>
							<BarChart
								data={netWorth}
								margin={{top: 5, right: 10, left: 20, bottom: 5}}
							>
							<XAxis dataKey="date"/>
							<YAxis hide/>
							<CartesianGrid strokeDasharray="3 3"/>
							<Tooltip formatter={this.formatter} />
							<Bar dataKey="netWorth" fill="#8884d8" />
							</BarChart>
						</ResponsiveContainer>
					}
				</div>
			</div>
		);
	}
}

NetWorth.propTypes = {
	netWorth:  PropTypes.array.isRequired,
	getNetWorthAction: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
	netWorth: state.netWorth
});

const mapDispatchToProps = dispatch => ({
	getNetWorthAction () {
		dispatch(getNetWorthAction());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(NetWorth);
