import {
	SET_USERNAME
} from './actionTypes';

import {
	finalizeCouchdbAction,
	initCouchdbAction
} from './couchdbActions';

import {
	login,
	logout,
	checkAuthState
} from '../service/pouchdb';

export const setUsername = (username) => ({
	type: SET_USERNAME,
	payload: username
});

export const getAuthAction = () => {
	return async dispatch => {
		const authState = await checkAuthState();
		if (authState.userCtx.name) {
			dispatch(setUsername(authState.userCtx.name));
			dispatch(initCouchdbAction(authState.userCtx.name));
		} else {
			dispatch(setUsername(''));
		}
	};
};

export const loginAction = params => {
	return async dispatch => {
		const response = await login(params.username, params.password);
		dispatch(setUsername(response.name));
		dispatch(initCouchdbAction(response.name));
	};
};

export const logoutAction = () => {
	return async dispatch => {
		await logout();
		dispatch(setUsername(''));
		dispatch(finalizeCouchdbAction());
	};
};