import React from 'react';
import { useSelector } from 'react-redux';

import PerformanceGrid from '../components/PerformanceGrid';

import { getAccountPerformance } from '../utils/performance';

export function AccountInvestments () {
	const account = useSelector((state) => state.account);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const allInvestmentsPrice = useSelector((state) => state.allInvestmentsPrice);
	const accountInvestments = useSelector((state) => state.accountInvestments);
	const allInvestmentsTransactions = allAccountsTransactions.filter(i => i.accountId && i.accountId.startsWith('account:Invst'));
	const accountPerformance = getAccountPerformance(account, accountInvestments, allInvestmentsTransactions, allInvestmentsPrice);
	const totalCostBasis = accountPerformance.length > 0 ? accountPerformance.map(i => i.costBasis).reduce((a, b) => a + b) : 0;
	const totalMarketValue = accountPerformance.length > 0 ? accountPerformance.map(i => i.marketValue).reduce((a, b) => a + b) : 0;
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
		<div className="investments">
			<PerformanceGrid
				performanceData={performanceData}
			/>
		</div>
	);
}

export default AccountInvestments;
