import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Dimmer } from 'semantic-ui-react';
import throttle from 'lodash/throttle';

import Routes from './routes';



import { toggleSidebar } from './actions/uiActions';
import { windowResize } from './actions/ui/windowResize';
import { rehydrateAction } from './actions/rehydrateActions';

import './App.css';

class App extends React.Component {
	componentDidMount () {
		this.props.rehydrateAction();

		window.addEventListener('resize', throttle(this.props.windowResize, 500));
	}

	render () {
		const { isSidebarOpen, toggleSidebar } = this.props;

		return (
			<div className="App">
				<div
					className={isSidebarOpen ? 'openSidebar' : 'closedSidebar'}
					onClick={isSidebarOpen ? toggleSidebar : undefined}
				>
					<Dimmer.Dimmable
						className="container"
						onClick={isSidebarOpen ? toggleSidebar : undefined}
					>
						<Dimmer
							active={isSidebarOpen}
							onClick={toggleSidebar}
						/>
						<Routes />
					</Dimmer.Dimmable>
				</div>
			</div>
		);
	}
}

App.propTypes = {
	isSidebarOpen: PropTypes.bool,
	rehydrateAction: PropTypes.func,
	toggleSidebar: PropTypes.func,
	windowResize: PropTypes.func
};

const mapStateToProps = state => ({
	isSidebarOpen: state.ui.isSidebarOpen
});

export default connect(
	mapStateToProps,
	{
		rehydrateAction,
		toggleSidebar,
		windowResize
	}
)(App);
