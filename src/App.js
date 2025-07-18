import React, { useEffect, useMemo } from 'react';
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
	getPayeeListAction
} from './actions/couchdbActions';

import {
	getSettingsAction
} from './actions/couchdbSettingActions';

import useDarkMode from './hooks/useDarkMode';

import theme from './theme';

import './App.css';

function App () {
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { themeMode = 'auto' } = useSelector((state) => state.settings);
	const prefersDarkMode = useDarkMode();

	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(rehydrateAction());
		dispatch(getAuthAction());
		dispatch(getAccountListAction());
		dispatch(getSettingsAction());
	}, [dispatch]);

	useEffect(() => {
		if (accountList.length > 0 && allAccountsTransactions.length < 1) {
			dispatch(getAllAccountsTransactionsAction());
			dispatch(getAllInvestmentsListAction());
			dispatch(getPayeeListAction());
		}
	}, [accountList, allAccountsTransactions, dispatch]);

	const isDarkMode = useMemo(() => {
		if (themeMode === 'light') {
			return false;
		}
		if (themeMode === 'dark') {
			return true;
		}
		// 'auto' or default
		return prefersDarkMode;
	}, [themeMode, prefersDarkMode]);

	return (
		<ThemeProvider theme={theme({ prefersDarkMode: isDarkMode })}>
			<CssBaseline />
			<Routes />
		</ThemeProvider >
	);
}

export default App;
