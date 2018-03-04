import React from 'react';
import { Route, Link } from 'react-router-dom';
import { Icon, Menu } from 'semantic-ui-react';

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
		icon: 'bar graph'
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
	}
];

const SidebarMenu = () => (
	<nav>
		<Menu fluid color="blue" vertical icon="labeled">
			{routes.map(route => (
				<Route
					key={route.path}
					exact={route.exact}
					path={route.path}
					children={({ match }) => { // eslint-disable-line react/no-children-prop
						return (
							<Menu.Item as={Link} to={route.path} active={!!match}>
								<Icon name={route.icon} />
								{route.label}
							</Menu.Item>
						);
					}}
				/>
			))}
		</Menu>
	</nav>
);

export default SidebarMenu;
