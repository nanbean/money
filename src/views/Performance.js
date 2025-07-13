import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import Layout from '../components/Layout';
import InvestmentPerformance from '../components/InvestmentPerformance';
import Typography from '@mui/material/Typography';

import { getInvestmentPerformance } from '../utils/performance';

const getInvestmentItem = (investments, name) => investments.find(i => i.name === name);
const getInvestmentTransactions = (transactions, investment) => transactions.filter(i => i.investment && i.investment === investment);

export function Performance () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const allInvestments = useSelector((state) => state.allInvestments);
	const { investment: investmentName } = useParams();

	const investmentItem = useMemo(() => getInvestmentItem(allInvestments, investmentName), [allInvestments, investmentName]);
	const investmentTransactions = useMemo(() => getInvestmentTransactions(allAccountsTransactions, investmentName), [allAccountsTransactions, investmentName]);

	const performance = useMemo(() => {
		// Performance can only be calculated if we have the investment item (and its price)
		if (!investmentItem) {
			return [];
		}
		return getInvestmentPerformance(investmentTransactions, investmentItem.price);
	}, [investmentTransactions, investmentItem]);

	return (
		<Layout showPaper={false} title={investmentItem ? investmentName : 'Not Found'}>
			{investmentItem ? (
				<InvestmentPerformance
					investment={investmentName}
					price={investmentItem.price}
					currency={investmentItem.currency}
					performance={performance}
					symbol={investmentItem.yahooSymbol}
				/>
			) : (
				<Typography>Investment "{investmentName}" could not be found.</Typography>
			)}
		</Layout>
	);
}

export default Performance;
