import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

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
	getSettingsAction
} from './actions/couchdbActions';

import useDarkMode from './hooks/useDarkMode';

import theme from './theme';

import './App.css';

function App () {
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const prefersDarkMode = useDarkMode();

	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(rehydrateAction());
		dispatch(getAuthAction());
		dispatch(getAccountListAction());
		dispatch(getSettingsAction());
	}, []);

	useEffect(() => {
		if (accountList.length > 0 && allAccountsTransactions.length < 1) {
			dispatch(getAllAccountsTransactionsAction());
			dispatch(getAllInvestmentsListAction());
			dispatch(getPayeeListAction());
		}
	}, [accountList]);

	return (
		<ThemeProvider theme={theme({ prefersDarkMode })}>
			<CssBaseline />
			<Routes />
		</ThemeProvider >
	);
}

export default App;
