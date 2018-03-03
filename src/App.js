import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { Switch, Route } from 'react-router-dom';
import { Dimmer } from 'semantic-ui-react';
import throttle from 'lodash/throttle'

import {
	Home,
	Bank,
	Investment,
	NetWorth,
	LifetimePlanner,
	Performance,
	AllPerformance,
	Report,
	Search
} from './views';

import SidebarMenu from './components/SidebarMenu';

import { toggleSidebar } from './actions/uiActions';
import { windowResize } from './actions/ui/windowResize';

import './App.css';

const Routing = () => (
	<Switch>
		<Route exact path='/' component={Home} />
		<Route path="/bank/:name" component={Bank} />
		<Route path="/investment/:name" component={Investment} />
		<Route exact path="/networth" component={NetWorth} />
		<Route path="/lifetimeplanner" component={LifetimePlanner} />
		<Route path="/performance/:investment" component={Performance} />
		<Route exact path="/allperformance" component={AllPerformance} />
		<Route exact path="/report" component={Report} />
		<Route exact path="/search" component={Search} />
		<Route path="/search/:keyword" component={Search} />
	</Switch>
);

class App extends React.Component {
	componentWillMount() {
		window.addEventListener('resize', throttle(this.props.windowResize, 500))
	}

	render() {
		const { isSidebarOpen, toggleSidebar } = this.props;

		return (
			<div className='App'>
				<div
					className={isSidebarOpen ? 'openSidebar' : 'closedSidebar'}
					onClick={isSidebarOpen ? toggleSidebar : undefined}
				>
					<SidebarMenu />
					<Dimmer.Dimmable
						className="container"
						onClick={isSidebarOpen ? toggleSidebar : undefined}
					>
						<Dimmer
							active={isSidebarOpen}
							onClick={toggleSidebar}
						/>
							<Routing />
					</Dimmer.Dimmable>
				</div>
			</div>
		);
	}
}

App.propTypes = {
	isSidebarOpen: PropTypes.bool,
	toggleSidebar: PropTypes.func
}

const mapStateToProps = state => ({
	isSidebarOpen: state.ui.isSidebarOpen
});

export default withRouter(connect(
	mapStateToProps,
	{
		toggleSidebar,
		windowResize
	}
)(App));
