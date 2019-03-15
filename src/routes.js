import React from 'react';
import { Route, BrowserRouter, Switch } from 'react-router-dom';

import SidebarMenu from './components/SidebarMenu';

import {
	Home,
	Bank,
	Investment,
	NetWorth,
	LifetimePlanner,
	Performance,
	AllPerformance,
	Report,
	Search,
	Setting,
	NotificationLog
} from './views';

// eslint-disable-next-line react/display-name
function Routes () {
	return (
		<BrowserRouter>
			<div>
				<SidebarMenu />
				<Switch>
					<Route exact path="/" component={Home} />
					<Route path="/bank/:name" component={Bank} />
					<Route path="/investment/:name" component={Investment} />
					<Route exact path="/networth" component={NetWorth} />
					<Route path="/lifetimeplanner" component={LifetimePlanner} />
					<Route path="/performance/:investment" component={Performance} />
					<Route exact path="/allperformance" component={AllPerformance} />
					<Route exact path="/report" component={Report} />
					<Route exact path="/search" component={Search} />
					<Route path="/search/:keyword" component={Search} />
					<Route exact path="/setting" component={Setting} />
					<Route exact path="/notificationlog" component={NotificationLog} />
				</Switch>
			</div>
		</BrowserRouter>
	);
}

export default Routes;
