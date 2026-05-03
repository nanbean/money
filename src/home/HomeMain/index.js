import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import Box from '@mui/material/Box';

import Layout from '../../components/Layout';
import MobileMenuButton from '../../components/MobileMenuButton';
import useT from '../../hooks/useT';
import useMobile from '../../hooks/useMobile';

import HomeHero from '../HomeHero';
import HomeCashFlow from '../HomeCashFlow';
import HomeWeeklySpend from '../HomeWeeklySpend';
import HomeUpcoming from '../HomeUpcoming';
import HomeAccountsGrid from '../HomeAccountsGrid';
import HomeRecentActivity from '../HomeRecentActivity';
import StockList from '../StockList';
import WeeklyRecap, { getISOWeekKey, DISMISS_KEY } from '../WeeklyRecap';

import { getWeeklyTransactionsAction } from '../../actions/couchdbActions';

const now = new Date();
const dayOfWeek = now.getDay();
const hour = now.getHours();
// 미국 금요일 장 마감(KST 토요일 아침) 이후 ~ 한국 월요일 장 시작(KST 09:00) 이전
const showWeeklyRecapDay = dayOfWeek === 6 || dayOfWeek === 0 || (dayOfWeek === 1 && hour < 9);

export function HomeMain () {
	const dispatch = useDispatch();
	const T = useT();
	const isMobile = useMobile();

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
			<Box sx={{
				background: T.bg,
				color: T.ink,
				maxWidth: 1320,
				padding: { xs: '16px 16px 32px', md: '24px 32px 60px' },
				minHeight: '100vh'
			}}>
				{isMobile && (
					<Box sx={{ marginBottom: '12px' }}>
						<MobileMenuButton />
					</Box>
				)}
				<HomeHero />

				{showWeeklyRecap && (
					<Box sx={{ marginBottom: '20px' }}>
						<WeeklyRecap onDismiss={handleDismissWeeklyRecap} />
					</Box>
				)}

				{/* 3-column metrics row */}
				<Box sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr 1fr' },
					gap: 2,
					marginBottom: '20px'
				}}>
					<HomeCashFlow />
					<HomeWeeklySpend />
					<HomeUpcoming />
				</Box>

				<HomeAccountsGrid />

				{/* 2-column row: Recent activity + side panels */}
				<Box sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
					gap: 2
				}}>
					<HomeRecentActivity />
					<StockList />
				</Box>
			</Box>
		</Layout>
	);
}

export default HomeMain;
