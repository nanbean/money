import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import Masonry from '@mui/lab/Masonry';
import Paper from '@mui/material/Paper';

import Layout from '../../components/Layout';

import LatestTransactions from '../LatestTransactions';
import AccountList from '../AccountList';
import WeeklyGraph from '../WeeklyGraph';
import StockList from '../StockList';
import PaymentList from '../PaymentList';

import { getWeeklyTransactionsAction } from '../../actions/couchdbActions';

const panels = [
	{ key: 'accounts', component: AccountList },
	{ key: 'stockList', component: StockList },
	{ key: 'weeklyGraph', component: WeeklyGraph },
	{ key: 'latestTransactions', component: LatestTransactions },
	{ key: 'paymentList', component: PaymentList }
];

export function HomeMain () {
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(getWeeklyTransactionsAction());
	}, [dispatch]);

	return (
		<Layout showPaper={false} title="Home">
			<Masonry columns={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}>
				{panels.map(({ key, component: Component }) => (
					<Paper key={key}>
						<Component />
					</Paper>
				))}
			</Masonry>
		</Layout>
	);
}

export default HomeMain;