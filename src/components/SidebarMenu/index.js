import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
	useLocation,
	Link
} from 'react-router-dom';

import { styled } from '@mui/material/styles';

import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CategoryIcon from '@mui/icons-material/Category';
import HomeIcon from '@mui/icons-material/Home';
import TableChartIcon from '@mui/icons-material/TableChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';

import { toggleSidebar } from '../../actions/uiActions';
import { updateInvestmentPriceAction } from '../../actions/priceActions';

import useMobile from '../../hooks/useMobile';

const drawerWidth = 240;

const linkStyle = {
	textDecoration: 'none',
	color: 'inherit'
};

const routes = [
	{
		path: '/',
		exact: true,
		label: 'Home',
		icon: <HomeIcon />
	},
	{
		path: '/allperformance',
		label: 'All Performance',
		icon: <TableChartIcon />
	},
	{
		path: '/networth',
		label: 'Net Worth',
		icon: <BarChartIcon />
	},
	{
		path: '/lifetimeplanner',
		label: 'Lifetime Planner',
		icon: <ShowChartIcon />
	},
	{
		path: '/report',
		label: 'Report',
		icon: <CategoryIcon />
	},
	{
		path: '/search',
		label: 'Search',
		icon: <SearchIcon />
	}
];

const anotherRoutes = [
	{
		path: '/setting',
		label: 'Setting',
		icon: <SettingsIcon />
	}
];

const Toolbar = styled('div')(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'flex-end',
	padding: '0 8px',
	...theme.mixins.toolbar
}));

function SidebarMenu ()
{
	const isSidebarOpen = useSelector((state) => state.ui.isSidebarOpen);
	const dispatch = useDispatch();
	const isMobile = useMobile();
	const location = useLocation();

	const onClickHandler = () => {
		if (isMobile) {
			dispatch(toggleSidebar());
		}
	};

	const onRefreshClickHandler = () => dispatch(updateInvestmentPriceAction());

	return (
		<Drawer
			variant="permanent"
			sx={(theme) => {
				if (isSidebarOpen) {
					return {
						position: 'relative',
						boxSizing: 'border-box',
						width: drawerWidth,
						flexShrink: 0,
						whiteSpace: 'nowrap',
						transition: theme.transitions.create('width', {
							easing: theme.transitions.easing.sharp,
							duration: theme.transitions.duration.enteringScreen
						}),
						[theme.breakpoints.down('sm')]: {
							width: theme.spacing(7)
						},
						'& .MuiDrawer-paper': {
							width: drawerWidth,
							transition: theme.transitions.create('width', {
								easing: theme.transitions.easing.sharp,
								duration: theme.transitions.duration.enteringScreen
							}),
							[theme.breakpoints.down('sm')]: {
								width: theme.spacing(7)
							}							
						}
					};
				} else {
					return {
						position: 'relative',
						boxSizing: 'border-box',
						width: theme.spacing(7),
						flexShrink: 0,
						whiteSpace: 'nowrap',
						transition: theme.transitions.create('width', {
							easing: theme.transitions.easing.sharp,
							duration: theme.transitions.duration.leavingScreen
						}),
						overflowX: 'hidden',
						[theme.breakpoints.down('sm')]: {
							width: 0
						},
						'& .MuiDrawer-paper': {
							width: theme.spacing(7),
							overflowX: 'hidden',
							transition: theme.transitions.create('width', {
								easing: theme.transitions.easing.sharp,
								duration: theme.transitions.duration.leavingScreen
							}),
							[theme.breakpoints.down('sm')]: {
								width: 0
							}
						}
					};
				}
			}}
			open={isSidebarOpen}
		>
			<Toolbar/>
			<Divider />
			<List>
				{routes.map(item => (
					<Link key={item.label} to={item.path} style={linkStyle}>
						<ListItem
							button
							onClick={onClickHandler}
							selected={item.path === location.pathname}
						>
							<ListItemIcon>{item.icon}</ListItemIcon>
							<ListItemText primary={item.label} />
						</ListItem>
					</Link>
				))}
			</List>
			<Divider />
			<List>
				<ListItem
					button
					onClick={onRefreshClickHandler}
				>
					<ListItemIcon><RefreshIcon /></ListItemIcon>
					<ListItemText primary="Refresh" />
				</ListItem>
				{anotherRoutes.map(item => (
					<Link key={item.label} to={item.path} style={linkStyle}>
						<ListItem
							button
							onClick={onClickHandler}
							selected={item.path === location.pathname}
						>
							<ListItemIcon>{item.icon}</ListItemIcon>
							<ListItemText primary={item.label} />
						</ListItem>
					</Link>
				))}
			</List>
		</Drawer>
	);
}

export default SidebarMenu;
