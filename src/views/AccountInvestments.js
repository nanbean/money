import React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import NormalGrid from '../components/NormalGrid';

import { getAccountPerformance } from '../utils/performance';

export function AccountInvestments ({ currency }) {
	const account = useSelector((state) => state.account);
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const allInvestmentsPrice = useSelector((state) => state.allInvestmentsPrice);
	const accountInvestments = useSelector((state) => state.accountInvestments);
	const allInvestmentsTransactions = allAccountsTransactions.filter(i => i.accountId && i.accountId.startsWith('account:Invst'));
	const accountPerformance = getAccountPerformance(account, accountInvestments, allInvestmentsTransactions, allInvestmentsPrice);
	const totalCostBasis = accountPerformance.length > 0 ? accountPerformance.map(i => i.costBasis).reduce((a, b) => a + b) : 0;
	const totalMarketValue = accountPerformance.length > 0 ? accountPerformance.map(i => i.marketValue).reduce((a, b) => a + b) : 0;
	const totalPeriodGain = accountPerformance.length > 0 ? accountPerformance.map(i => i.periodGain).reduce((a, b) => a + b) : 0;
	const totalPeriodReturn = accountPerformance.length > 0 ? accountPerformance.map(i => i.periodReturn).reduce((a, b) => a + b) : 0;
	const totalBalance = (accountList.find(i => i.name === account) || {}).balance;
	const cash = totalBalance - totalMarketValue;

	const performanceData = [
		[
			{ type: 'label', value: 'Investment' },
			{ type: 'label', value: 'Price' },
			{ type: 'label', value: 'Quantity' },
			{ type: 'label', value: 'Cost Basis' },
			{ type: 'label', value: 'Market Value' },
			{ type: 'label', value: 'Realized Gain/Loss' },
			{ type: 'label', value: 'Return for Period' },
			{ type: 'label', value: '%Port' }
		],
		...accountPerformance.filter(j => j.name).map(i => {
			return [
				{ value: i.name },
				{ type: 'currency', currency, value: i.price },
				{ value: i.quantity },
				{ type: 'currency', currency, value: i.costBasis },
				{ type: 'currency', currency, value: i.marketValue },
				{ type: 'currency', currency, value: i.periodGain },
				{ type: 'currency', currency, value: i.periodReturn },
				{ value: `${(i.marketValue/totalMarketValue * 100).toFixed(2)}%` }
			];
		}),
		[
			{ type: 'label', value: 'Cash' },
			{ type: 'label', value: '' },
			{ type: 'label', value: '' },
			{ type: 'label', value: '' },
			{ type: 'currency', currency, value: cash },
			{ type: 'label', value: '' },
			{ type: 'label', value: '' },
			{ type: 'label', value: '' }
		],
		[
			{ type: 'label', value: '' },
			{ type: 'label', value: '' },
			{ type: 'label', value: '' },
			{ type: 'currency', currency, value: totalCostBasis },
			{ type: 'currency', currency, value: totalBalance },
			{ type: 'currency', currency, value: totalPeriodGain },
			{ type: 'currency', currency, value: totalPeriodReturn },
			{ type: 'label', value: '' }
		]
	];

	return (
		<div className="investments">
			<NormalGrid
				gridData={performanceData}
			/>
		</div>
	);
}

AccountInvestments.propTypes = {
	currency: PropTypes.string
};

export default AccountInvestments;
