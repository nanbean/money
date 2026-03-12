import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import Masonry from '@mui/lab/Masonry';
import Paper from '@mui/material/Paper';

import Layout from '../../components/Layout';

import LatestTransactions from '../LatestTransactions';
import AccountList from '../AccountList';
import WeeklyGraph from '../WeeklyGraph';
import StockList from '../StockList';
import PaymentList from '../PaymentList';
import WeeklyRecap, { getISOWeekKey, DISMISS_KEY } from '../WeeklyRecap';

import { getWeeklyTransactionsAction } from '../../actions/couchdbActions';

const basePanels = [
	{ key: 'accounts', component: AccountList },
	{ key: 'stockList', component: StockList },
	{ key: 'weeklyGraph', component: WeeklyGraph },
	{ key: 'latestTransactions', component: LatestTransactions },
	{ key: 'paymentList', component: PaymentList }
];

const now = new Date();
const dayOfWeek = now.getDay();
const hour = now.getHours();
// 미국 금요일 장 마감(KST 토요일 아침) 이후 ~ 한국 월요일 장 시작(KST 09:00) 이전
const showWeeklyRecapDay = dayOfWeek === 6 || dayOfWeek === 0 || (dayOfWeek === 1 && hour < 9);

export function HomeMain () {
	const dispatch = useDispatch();
	const [weeklyRecapDismissed, setWeeklyRecapDismissed] = useState(
		() => localStorage.getItem(DISMISS_KEY) === getISOWeekKey()
	);

	useEffect(() => {
		dispatch(getWeeklyTransactionsAction());
	}, [dispatch]);

	const handleDismissWeeklyRecap = () => {
		localStorage.setItem(DISMISS_KEY, getISOWeekKey());
		setWeeklyRecapDismissed(true);
	};

	const showWeeklyRecap = showWeeklyRecapDay && !weeklyRecapDismissed;

	return (
		<Layout showPaper={false} title="Home">
			<Masonry columns={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}>
				{showWeeklyRecap && (
					<Paper key="weeklyRecap">
						<WeeklyRecap onDismiss={handleDismissWeeklyRecap} />
					</Paper>
				)}
				{basePanels.map(({ key, component: Component }) => (
					<Paper key={key}>
						<Component />
					</Paper>
				))}
			</Masonry>
		</Layout>
	);
}

export default HomeMain;