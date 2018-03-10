import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import PerformanceGrid from '../components/PerformanceGrid';

import { getAccountPerformance } from '../utils/performance';

class AccountInvestments extends Component {
	render () {
		const { account, accountInvestments, allInvestmentsTransactions, allInvestmentsPrice } = this.props;
		const cash = accountInvestments.length > 0 ? accountInvestments.find(i => i.name === 'cash').amount : 0;
		const accountPerformance = getAccountPerformance(account, accountInvestments, allInvestmentsTransactions, allInvestmentsPrice);
		const totalCostBasis = accountPerformance.length > 0 ? accountPerformance.map(i => i.costBasis).reduce((a, b) => a + b) : 0;
		const totalMarketValue = accountPerformance.length > 0 ? (accountPerformance.map(i => i.marketValue).reduce((a, b) => a + b) + cash) : 0;
		const totalPeriodGain = accountPerformance.length > 0 ? accountPerformance.map(i => i.periodGain).reduce((a, b) => a + b) : 0;
		const totalPeriodReturn = accountPerformance.length > 0 ? accountPerformance.map(i => i.periodReturn).reduce((a, b) => a + b) : 0;

		const performanceData = [
			[
				'Investment',
				'Price',
				'Quantity',
				'Cost Basis',
				'Market Value',
				'Realized Gain/Loss',
				'Return for Period',
				'%Port'
			],
			...accountPerformance.filter(j => j.name).map(i => {
				return [
					i.name,
					i.price,
					i.quantity,
					i.costBasis,
					i.marketValue,
					i.periodGain,
					i.periodReturn,
					`${i.marketValue/totalMarketValue * 100}%`
				];
			}),
			[
				'Cash',
				'',
				'',
				'',
				cash,
				'',
				'',
				''
			],
			[
				'',
				'',
				'',
				totalCostBasis,
				totalMarketValue,
				totalPeriodGain,
				totalPeriodReturn,
				''
			]
		];

		return (
			<div className='investments'>
				<PerformanceGrid
					performanceData={performanceData}
				/>
			</div>
		);
	}
}

AccountInvestments.propTypes = {
	account: PropTypes.string.isRequired,
	allInvestmentsTransactions: PropTypes.array.isRequired,
	allInvestmentsPrice: PropTypes.array.isRequired,
	accountList:  PropTypes.array.isRequired,
	accountInvestments: PropTypes.array.isRequired
};

const mapStateToProps = state => ({
	account: state.account,
	allInvestmentsTransactions: state.allInvestmentsTransactions,
	allInvestmentsPrice: state.allInvestmentsPrice,
	accountList: state.accountList,
	accountInvestments: state.accountInvestments
});

export default connect(
	mapStateToProps,
	null
)(AccountInvestments);
