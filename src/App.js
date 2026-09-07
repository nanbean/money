import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';

import Routes from './routes';

import { rehydrateAction } from './actions/rehydrateActions';
import { getAuthAction } from './actions/authActions';
import {
	getAllAccountsTransactionsAction,
	getAllInvestmentsListAction,
	getPayeeListAction,
	resumeCouchdbAction
} from './actions/couchdbActions';

import {
	getAccountListAction
} from './actions/couchdbAccountActions';

import {
	getSettingsAction
} from './actions/couchdbSettingActions';

import {
	autoRefreshTokenAction
} from './actions/messagingActions';

import useAppResume from './hooks/useAppResume';
import useDarkMode from './hooks/useDarkMode';

import theme from './theme';

import './App.css';

function App () {
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const isDarkMode = useDarkMode();

	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(rehydrateAction());
		dispatch(getAuthAction());
		dispatch(getAccountListAction());
		dispatch(getSettingsAction());
		dispatch(autoRefreshTokenAction());
	}, [dispatch]);

	// iOS 홈 화면 PWA 에는 새로 고침 수단이 없다. 한참 뒤에 다시 열면
	// 데이터가 그대로여서, 복귀를 감지해 다시 붙인다.
	useAppResume(useCallback(() => {
		dispatch(resumeCouchdbAction());
	}, [dispatch]));

	useEffect(() => {
		if (accountList.length > 0 && allAccountsTransactions.length < 1) {
			dispatch(getAllAccountsTransactionsAction());
			dispatch(getAllInvestmentsListAction());
			dispatch(getPayeeListAction());
		}
	}, [accountList, allAccountsTransactions, dispatch]);

	return (
		<ThemeProvider theme={theme({ prefersDarkMode: isDarkMode })}>
			<CssBaseline />
			<Routes />
		</ThemeProvider >
	);
}

export default App;
