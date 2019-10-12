import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import throttle from 'lodash/throttle';
import { MuiThemeProvider } from '@material-ui/core/styles';

import Routes from './routes';

// TODO remove windowResize
import { windowResize } from './actions/ui/windowResize';
import { rehydrateAction } from './actions/rehydrateActions';
import { getAuthAction } from './actions/authActions';
import {
	getAccountListAction,
	getAllAccountsTransactionsAction,
	getAllInvestmentsListAction,
	getPayeeListAction,
	getCategoryListAction
} from './actions/couchdbActions';

import theme from './theme';

import './App.css';

class App extends React.Component {
	componentDidMount () {
		this.props.rehydrateAction();
		this.props.getAuthAction();
		this.props.getAccountListAction();

		window.addEventListener('resize', throttle(this.props.windowResize, 500));

		setTimeout(() => {
			this.props.getAllAccountsTransactionsAction();
			this.props.getAllInvestmentsListAction();
			this.props.getCategoryListAction();
			this.props.getPayeeListAction();
		}, 1000);
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
	getAccountListAction: PropTypes.func.isRequired,
	getAllAccountsTransactionsAction: PropTypes.func.isRequired,
	getAllInvestmentsListAction: PropTypes.func.isRequired,
	getAuthAction: PropTypes.func.isRequired,
	getCategoryListAction: PropTypes.func.isRequired,
	getPayeeListAction: PropTypes.func.isRequired,
	rehydrateAction: PropTypes.func.isRequired,
	windowResize: PropTypes.func.isRequired
};

const mapDispatchToProps = dispatch => ({
	getAccountListAction () {
		dispatch(getAccountListAction());
	},
	getAllAccountsTransactionsAction () {
		dispatch(getAllAccountsTransactionsAction());
	},
	getAllInvestmentsListAction () {
		dispatch(getAllInvestmentsListAction());
	},
	getAuthAction () {
		dispatch(getAuthAction());
	},
	getCategoryListAction () {
		dispatch(getCategoryListAction());
	},
	getPayeeListAction () {
		dispatch(getPayeeListAction());
	},
	rehydrateAction () {
		dispatch(rehydrateAction());
	},
	windowResize () {
		dispatch(windowResize());
	}
});

export default connect(
	null,
	mapDispatchToProps
)(App);
