import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import Masonry from '@mui/lab/Masonry';
import Paper from '@mui/material/Paper';

import LatestTransactions from '../LatestTransactions';
import AccountList from '../AccountList';
import WeeklyGraph from '../WeeklyGraph';
import StockList from '../StockList';
import PaymentList from '../PaymentList';

import Container from '../../components/Container';
import TitleHeader from '../../components/TitleHeader';

import { getWeeklyTransactionsAction } from '../../actions/couchdbActions';

const panels = [
	{ key: 'accounts', component: AccountList },
	{ key: 'weeklyGraph', component: WeeklyGraph },
	{ key: 'latestTransactions', component: LatestTransactions },
	{ key: 'stockList', component: StockList },
	{ key: 'paymentList', component: PaymentList }
];

export function HomeMain () {
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(getWeeklyTransactionsAction());
	}, [dispatch]);

	return (
		<>
			<TitleHeader title="Home" />
			<Container>
				<Masonry columns={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}>
					{panels.map(({ key, component: Component }) => (
						<Paper key={key}>
							<Component />
						</Paper>
					))}
				</Masonry>
			</Container>
		</>
	);
}

export default HomeMain;