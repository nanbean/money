import React from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';

import { styled } from '@mui/material/styles';

import CssBaseline from '@mui/material/CssBaseline';

import SidebarMenu from './components/SidebarMenu';

import {
	Bank,
	Investment,
	NetWorth,
	LifetimePlanner,
	Performance,
	AllPerformance,
	Search,
	Transactions
} from './views';
import ReportMain from './report/ReportMain';
import SettingMain from './setting/SettingMain';

import HomeMain from './home/HomeMain';
import Signin from './user/Signin';

import {
	BANK_TYPE,
	INVEST_TYPE
} from './constants';

const Content = styled('main')(({ theme }) => ({
	flexGrow: 1,
	backgroundColor: theme.palette.background.default
}));





// eslint-disable-next-line react/display-name
function RoutesMain () {
	return (
		<BrowserRouter>
			<div style={{ display: 'flex' }}>
				<CssBaseline />
				<SidebarMenu />
				<Content>
					<Routes>
						<Route path="/" element={<HomeMain />} />
						{
							BANK_TYPE.map(i => (<Route key={i} path={`/${i}/:name`} element={<Bank />} />))
						}
						{
							INVEST_TYPE.map(i => (<Route key={i} path={`/${i}/:name`} element={<Investment />} />))
						}
						<Route path="/networth" element={<NetWorth />} />
						<Route path="/lifetimeplanner" element={<LifetimePlanner />} />
						<Route path="/performance/:investment" element={<Performance />} />
						<Route path="/allperformance" element={<AllPerformance />} />
						<Route path="/search" element={<Search />} />
						<Route path="/transactions" element={<Transactions />} />
						<Route path="/report" element={<ReportMain />} />
						<Route path="/report/:tab" element={<ReportMain />} />
						<Route path="/setting" element={<SettingMain />} />
						<Route path="/setting/:tab" element={<SettingMain />} />
						<Route exact path="/signin" element={<Signin />} />
					</Routes>
				</Content>
			</div>
		</BrowserRouter>
	);
}

export default RoutesMain;
