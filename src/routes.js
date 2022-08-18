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
	Setting,
	NotificationLog
} from './views';
import ReportMain from './report/ReportMain';

import HomeMain from './home/HomeMain';
import Signin from './user/Signin';

const Content = styled('main')(({ theme }) => ({
	flexGrow: 1,
	backgroundColor: theme.palette.background.default
}));

const Toolbar = styled('div')(({ theme }) => ({
	...theme.mixins.toolbar
}));

// eslint-disable-next-line react/display-name
function RoutesMain () {
	return (
		<BrowserRouter>
			<div style={{ display: 'flex' }}>
				<CssBaseline />
				<SidebarMenu />
				<Content>
					<Toolbar />
					<Routes>
						<Route path="/" element={<HomeMain />} />
						<Route path="/bank/:name" element={<Bank/>} />
						<Route path="/Bank/:name" element={<Bank/>} />
						<Route path="/CCard/:name" element={<Bank/>} />
						<Route path="/Cash/:name" element={<Bank/>} />
						<Route path="/Oth A/:name" element={<Bank/>} />
						<Route path="/Oth L/:name" element={<Bank/>} />
						<Route path="/investment/:name" element={<Investment/>} />
						<Route path="/Invst/:name" element={<Investment/>} />
						<Route exact path="/networth" element={<NetWorth/>} />
						<Route path="/lifetimeplanner" element={<LifetimePlanner/>} />
						<Route path="/performance/:investment" element={<Performance/>} />
						<Route exact path="/allperformance" element={<AllPerformance/>} />
						<Route exact path="/report" element={<ReportMain/>} />
						<Route exact path="/search" element={<Search/>} />
						<Route path="/search/:keyword" element={<Search/>} />
						<Route exact path="/setting" element={<Setting/>} />
						<Route exact path="/notificationlog" element={<NotificationLog/>} />
						<Route exact path="/signin" element={<Signin/>} />
					</Routes>
				</Content>
			</div>
		</BrowserRouter>
	);
}

export default RoutesMain;
