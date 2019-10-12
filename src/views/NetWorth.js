import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { ResponsiveContainer, ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import LinearProgress from '@material-ui/core/LinearProgress';
import _ from 'lodash';

import TitleHeader from '../components/TitleHeader';

import {
	getHistoryListAction
} from '../actions/couchdbActions';
import { toCurrencyFormat } from '../utils/formatting';
import { getNetWorth } from '../utils/netWorth';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing.unit * 3,
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

class NetWorth extends Component {
	componentDidMount () {
		this.props.getHistoryListAction();
	}

	formatter (data) {
		return toCurrencyFormat(data);
	}

	render () {
		const {
			accountList,
			allAccountsTransactions,
			allInvestments,
			classes,
			historyList
		} = this.props;
		const date = new Date();
		const currentYear = date.getFullYear();
		const currentMonth = date.getMonth() + 1;
		const dates = [];
	
		for (let i = 2005; i <= currentYear; i++) {
			for (let j = 1; j <= (i === currentYear ? currentMonth : 12); j++) {
				if (j === 1 || j === 3 || j === 5 || j === 7 || j === 8 || j === 10 || j === 12) {
					dates.push(`${i}-${_.padStart(j, 2, '0')}-31`);
				} else if (j === 2) {
					if (((i % 4 === 0) && (i % 100 !== 0)) || (i % 400 === 0)) {
						dates.push(`${i}-${_.padStart(j, 2, '0')}-29`);
					} else {
						dates.push(`${i}-${_.padStart(j, 2, '0')}-28`);
					}
				} else {
					dates.push(`${i}-${_.padStart(j, 2, '0')}-30`);
				}
			}
		}

		if (accountList.length > 0 && allAccountsTransactions.length > 0 && allInvestments.length > 0 && historyList.length > 0) {
			const netWorth = dates.map(i => {
				return {
					date: i.substr(0,7),
					netWorth: getNetWorth(accountList, allInvestments, allAccountsTransactions, historyList, i),
					assetNetWorth: getNetWorth(accountList.filter(i => i.type === 'Oth A'), allInvestments, allAccountsTransactions, historyList, i)
				};
			});

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
		} else {
			return (
				<div>
					<TitleHeader title="Net Worth" />
					<LinearProgress color="secondary" className={classes.progress} />

				</div>
			);
		}
	}
}

NetWorth.propTypes = {
	accountList:  PropTypes.array.isRequired,
	allAccountsTransactions: PropTypes.array.isRequired,
	allInvestments: PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
	getHistoryListAction: PropTypes.func.isRequired,
	historyList: PropTypes.array.isRequired
};

const mapStateToProps = state => ({
	accountList: state.accountList,
	allAccountsTransactions: state.allAccountsTransactions,
	allInvestments: state.allInvestments,
	historyList: state.historyList
});

const mapDispatchToProps = dispatch => ({
	getHistoryListAction () {
		dispatch(getHistoryListAction());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(NetWorth));
