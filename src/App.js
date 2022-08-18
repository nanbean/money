import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';

import Routes from './routes';

import { rehydrateAction } from './actions/rehydrateActions';
import { getAuthAction } from './actions/authActions';
import {
	getAccountListAction,
	getAllAccountsTransactionsAction,
	getAllInvestmentsListAction,
	getPayeeListAction,
	getCategoryListAction,
	getSettingsAction
} from './actions/couchdbActions';

import theme from './theme';

import './App.css';

function App ({
	getAccountListAction,
	getAllAccountsTransactionsAction,
	getAllInvestmentsListAction,
	getAuthAction,
	getCategoryListAction,
	getPayeeListAction,
	getSettingsAction,
	rehydrateAction
}) {

	useEffect(() => {
		rehydrateAction();
		getAuthAction();
		getAccountListAction();

		getAllAccountsTransactionsAction();
		getAllInvestmentsListAction();
		getCategoryListAction();
		getPayeeListAction();
		getSettingsAction();
	}, []);

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<Routes />
		</ThemeProvider >
	);
}

App.propTypes = {
	getAccountListAction: PropTypes.func.isRequired,
	getAllAccountsTransactionsAction: PropTypes.func.isRequired,
	getAllInvestmentsListAction: PropTypes.func.isRequired,
	getAuthAction: PropTypes.func.isRequired,
	getCategoryListAction: PropTypes.func.isRequired,
	getPayeeListAction: PropTypes.func.isRequired,
	getSettingsAction: PropTypes.func.isRequired,
	rehydrateAction: PropTypes.func.isRequired
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
	getSettingsAction () {
		dispatch(getSettingsAction());
	},
	rehydrateAction () {
		dispatch(rehydrateAction());
	}
});

export default connect(
	null,
	mapDispatchToProps
)(App);
