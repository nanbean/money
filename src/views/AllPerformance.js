import React from 'react';
import { useSelector } from 'react-redux';

import Typography from '@mui/material/Typography';

import InvestmentPerformance from '../components/InvestmentPerformance';
import InvestmentFilter from '../components/InvestmentFilter';
import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';

import { toCurrencyFormatWithSymbol } from '../utils/formatting';
import { getInvestmentPerformance } from '../utils/performance';


export function AllPerformance () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const allInvestmentsPrice = useSelector((state) => state.allInvestmentsPrice);
	const filteredInvestments = useSelector((state) => state.filteredInvestments);
	const exchangeRate = useSelector((state) => state.settings.exchangeRate);

	const allInvestmentsTransactions = allAccountsTransactions.filter(i => i.accountId && i.accountId.startsWith('account:Invst'));

	const allPerformance = allInvestmentsTransactions.length > 0 && allInvestmentsPrice.length > 0 && 
		allInvestmentsPrice.filter(i => allInvestmentsTransactions.find(j => j.investment === i.name)).map(i => {
			const investmentTransactions = allInvestmentsTransactions.filter(j => j.investment === i.name);
			const investmentPrice = i.price;
			const performance = getInvestmentPerformance(investmentTransactions, investmentPrice);
			const totalPerformance = performance.length > 0 && performance.map(l => l.periodReturn).reduce((a, b) => a + b);
			const totalQuantity = performance.length > 0 && performance.map(m => m.quantity).reduce((a, b) => a + b);

			return {
				investment: i.name,
				price: i.price,
				currency: i.currency,
				performance: performance,
				totalPerformance: totalPerformance,
				totalQuantity: totalQuantity
			};
		});

	if (allPerformance.length > 0) {
		const filteredPerformance = allPerformance.length > 0 && allPerformance.filter(i => {
			return filteredInvestments.find(j => j === i.investment);
		});
		const grandTotalPerformance = filteredPerformance.length > 0
			? filteredPerformance.reduce((totals, l) =>
				totals + (l.currency === 'USD' ? l.totalPerformance * exchangeRate : l.totalPerformance), 0)
			: 0;

		return (
			<div>
				<TitleHeader title="Performance" />
				<Container>
					<InvestmentFilter
						allInvestments={allInvestmentsPrice.filter(i => allInvestmentsTransactions.find(j => j.investment === i.name)).map(k => k.name).sort()}
						filteredInvestments={filteredInvestments}
					/>
					<Typography
						variant="subtitle1"
						align="right"
						sx={(theme) => ({
							marginTop: theme.spacing(1),
							marginRight: theme.spacing(1)
						})}
					>
						Grand Total : {toCurrencyFormatWithSymbol(grandTotalPerformance)}
					</Typography>
					{
						filteredPerformance && filteredPerformance.map(i => {
							return (
								<InvestmentPerformance
									key={i.investment}
									investment={i.investment}
									price={i.price}
									currency={i.currency}
									performance={i.performance}
								/>
							);
						})
					}
					
				</Container>
			</div>
		);
	} else {
		return (
			<TitleHeader title="Performance" loading />
		);
	}
}

export default AllPerformance;
