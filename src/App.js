import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import throttle from 'lodash/throttle';
import { MuiThemeProvider } from '@material-ui/core/styles';

import Routes from './routes';

// TODO remove windowResize
import { windowResize } from './actions/ui/windowResize';
import { rehydrateAction } from './actions/rehydrateActions';

import theme from './theme';

import './App.css';

class App extends React.Component {
	componentDidMount () {
		this.props.rehydrateAction();

		window.addEventListener('resize', throttle(this.props.windowResize, 500));
	}

	render () {
		return (
			<MuiThemeProvider theme={theme}>
				<Routes />
			</MuiThemeProvider>
		);
	}
}

App.propTypes = {
	rehydrateAction: PropTypes.func,
	windowResize: PropTypes.func
};

export default connect(
	null,
	{
		rehydrateAction,
		windowResize
	}
)(App);
