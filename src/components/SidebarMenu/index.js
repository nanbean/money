import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
	withRouter,
	Link
} from 'react-router-dom';
import {
	Header,
	Icon,
	Menu
} from 'semantic-ui-react';

import { toggleSidebar } from '../../actions/uiActions';

import './index.css';

const routes = [
	{
		path: '/',
		exact: true,
		label: 'Home',
		icon: 'home'
	},
	{
		path: '/allperformance',
		label: 'All Performance',
		icon: 'table'
	},
	{
		path: '/networth',
		label: 'Net Worth',
		icon: 'chart bar'
	},
	{
		path: '/lifetimeplanner',
		label: 'Lifetime Planner',
		icon: 'balance'
	},
	{
		path: '/report',
		label: 'Report',
		icon: 'file text'
	},
	{
		path: '/search',
		label: 'Search',
		icon: 'search'
	},
	{
		path: '/setting',
		label: 'Setting',
		icon: 'setting'
	}
];

function SidebarMenu ({ location, toggleSidebar }) {
	function onClickHandler () {
		toggleSidebar();
	}

	return (
		<nav className="sidebar">
			<Header size="large" block textAlign="center">Money</Header>
			<Menu fluid color="blue" vertical icon="labeled">
				{routes.map(route => (
					<Menu.Item
						key={route.path}
						as={Link}
						to={route.path}
						active={route.path === location.pathname}
						onClick={onClickHandler}
					>
						<Icon name={route.icon} />
						{route.label}
					</Menu.Item>
				))}
			</Menu>
		</nav>
	);
}

SidebarMenu.propTypes = {
	location: PropTypes.object.isRequired,
	toggleSidebar: PropTypes.func.isRequired
};

const mapDispatchToProps = dispatch => ({
	toggleSidebar () {
		dispatch(toggleSidebar());
	}
});

export default withRouter(connect(
	null,
	mapDispatchToProps
)(SidebarMenu));
