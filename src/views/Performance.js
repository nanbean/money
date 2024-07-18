import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';
import InvestmentPerformance from '../components/InvestmentPerformance';

import { getInvestmentPerformance } from '../utils/performance';

const getInvestmentItem = (investments, name) => investments.find(i => i.name === name);
const getInvestmentTransactions = (transactions, investment) => transactions.filter(i => i.investment && i.investment === investment);

export function Performance () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const allInvestments = useSelector((state) => state.allInvestments);
	const { investment } = useParams();

	const investmentItem = useMemo(() => getInvestmentItem(allInvestments, investment), [allInvestments, investment]);
	const investmentPrice = investmentItem && investmentItem.price;
	const investmentCurrency = investmentItem && investmentItem.currency;
	const investmentTransactions = useMemo(() => getInvestmentTransactions(allAccountsTransactions, investment), [allAccountsTransactions, investment]);
	const performance = useMemo(() => getInvestmentPerformance(investmentTransactions, investmentPrice), [investmentTransactions, investmentPrice]);

	return (
		<React.Fragment>
			<TitleHeader title={investment} />
			<Container>
				<InvestmentPerformance
					investment={investment}
					price={investmentPrice}
					currency={investmentCurrency}
					performance={performance}
				/>
			</Container>
		</React.Fragment>
	);
}

export default Performance;
