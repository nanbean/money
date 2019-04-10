import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import {
	withRouter,
	Link
} from 'react-router-dom';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import CategoryIcon from '@material-ui/icons/Category';
import HomeIcon from '@material-ui/icons/Home';
import TableChartIcon from '@material-ui/icons/TableChart';
import BarChartIcon from '@material-ui/icons/BarChart';
import ShowChartIcon from '@material-ui/icons/ShowChart';
import SearchIcon from '@material-ui/icons/Search';
import SettingsIcon from '@material-ui/icons/Settings';

import { toggleSidebar } from '../../actions/uiActions';

// import './index.css';

const drawerWidth = 240;

const styles = theme => ({
	drawer: {
		width: drawerWidth,
		flexShrink: 0,
		whiteSpace: 'nowrap'
	},
	drawerOpen: {
		transition: theme.transitions.create('width', {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.enteringScreen
		}),
		width: drawerWidth,
		[theme.breakpoints.down('sm')]: {
			width: theme.spacing.unit * 7 + 1
		}
	},
	drawerClose: {
		transition: theme.transitions.create('width', {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.leavingScreen
		}),
		overflowX: 'hidden',
		width: theme.spacing.unit * 9 + 1,
		[theme.breakpoints.down('sm')]: {
			width: 0
		}
	},
	toolbar: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'flex-end',
		padding: '0 8px',
		...theme.mixins.toolbar
	},
	link: {
		textDecoration: 'none',
		color: 'inherit'
	}
});

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

function SidebarMenu ({ classes, isMobile, isSidebarOpen, location, toggleSidebar }) {
	function onClickHandler () {
		if (isMobile) {
			toggleSidebar();
		}
	}

	return (
		<Drawer
			variant="permanent"
			className={classNames(classes.drawer, {
				[classes.drawerOpen]: isSidebarOpen,
				[classes.drawerClose]: !isSidebarOpen
			})}
			classes={{
				paper: classNames({
					[classes.drawerOpen]: isSidebarOpen,
					[classes.drawerClose]: !isSidebarOpen
				})
			}}
			open={isSidebarOpen}
		>
			<div className={classes.toolbar} />
			<Divider />
			<List>
				{routes.map(item => (
					<Link key={item.label} to={item.path} className={classes.link}>
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
				{anotherRoutes.map(item => (
					<Link key={item.label} to={item.path} className={classes.link}>
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

SidebarMenu.propTypes = {
	classes: PropTypes.object.isRequired,
	isMobile: PropTypes.bool.isRequired,
	isSidebarOpen: PropTypes.bool.isRequired,
	location: PropTypes.object.isRequired,
	toggleSidebar: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
	isMobile: state.ui.isMobile,
	isSidebarOpen: state.ui.isSidebarOpen
});

const mapDispatchToProps = dispatch => ({
	toggleSidebar () {
		dispatch(toggleSidebar());
	}
});

export default withRouter(connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(SidebarMenu)));
