import React from 'react';
import PropTypes from 'prop-types';
import { Route, BrowserRouter, Switch } from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';

import SidebarMenu from './components/SidebarMenu';

import {
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

import HomeMain from './home/HomeMain';
import Signin from './user/Signin';

const styles = theme => ({
	root: {
		display: 'flex'
	},
	toolbar: theme.mixins.toolbar,
	content: {
		flexGrow: 1,
		backgroundColor: theme.palette.background.default
	}
});

// eslint-disable-next-line react/display-name
function Routes ({ classes }) {
	return (
		<BrowserRouter>
			<div className={classes.root}>
				<CssBaseline />
				<SidebarMenu />
				<main className={classes.content}>
					<div className={classes.toolbar} />
					<Switch>
						<Route exact path="/" component={HomeMain} />
						<Route path="/bank/:name" component={Bank} />
						<Route path="/Bank/:name" component={Bank} />
						<Route path="/CCard/:name" component={Bank} />
						<Route path="/Cash/:name" component={Bank} />
						<Route path="/Oth A/:name" component={Bank} />
						<Route path="/Oth L/:name" component={Bank} />
						<Route path="/investment/:name" component={Investment} />
						<Route path="/Invst/:name" component={Investment} />
						<Route exact path="/networth" component={NetWorth} />
						<Route path="/lifetimeplanner" component={LifetimePlanner} />
						<Route path="/performance/:investment" component={Performance} />
						<Route exact path="/allperformance" component={AllPerformance} />
						<Route exact path="/report" component={Report} />
						<Route exact path="/search" component={Search} />
						<Route path="/search/:keyword" component={Search} />
						<Route exact path="/setting" component={Setting} />
						<Route exact path="/notificationlog" component={NotificationLog} />
						<Route exact path="/signin" component={Signin} />
					</Switch>
				</main>
			</div>
		</BrowserRouter>
	);
}

Routes.propTypes = {
	classes: PropTypes.object.isRequired
};

export default withStyles(styles)(Routes);
