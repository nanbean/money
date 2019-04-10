import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { ResponsiveContainer, ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import TitleHeader from '../components/TitleHeader';

import { getNetWorthAction } from '../actions/netWorthActions';
import { toCurrencyFormat } from '../utils/formatting';

const styles = theme => ({
	container: {
		maxWidth: 1200,
		[theme.breakpoints.up('lg')]: {
			margin: '1em auto'
		},
		[theme.breakpoints.down('sm')]: {
			margin: 0
		}
	}
});

class NetWorth extends Component {
	componentDidMount () {
		this.props.getNetWorthAction();
	}

	formatter (data) {
		return toCurrencyFormat(data);
	}

	render () {
		const { classes, netWorth } = this.props;

		return (
			<div>
				<TitleHeader title="Net Worth" />
				<div className={classes.container}>
					{
						netWorth.length > 1 &&
							<ResponsiveContainer width="100%" height={400}>
								<ComposedChart
									data={netWorth}
									margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
								>
									<XAxis dataKey="date"/>
									<YAxis hide/>
									<CartesianGrid strokeDasharray="3 3"/>
									<Tooltip formatter={this.formatter} />
									<Area type="monotone" dataKey="assetNetWorth" fill="#999999" stroke="#999999" />
									<Bar dataKey="netWorth" fill="#8884d8" />
								</ComposedChart>
							</ResponsiveContainer>
					}
				</div>
			</div>
		);
	}
}

NetWorth.propTypes = {
	classes: PropTypes.object.isRequired,
	getNetWorthAction: PropTypes.func.isRequired,
	netWorth:  PropTypes.array.isRequired
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
)(withStyles(styles)(NetWorth));
