import {
	SET_ACCOUNT,
	SET_ACCOUNT_LIST
} from './actionTypes';

export const setAccountAction = params => ({
	type: SET_ACCOUNT,
	payload: params
});

export const fetchGetAccountListSuccess = params => ({
	type: SET_ACCOUNT_LIST,
	payload: params.list
});

export const fetchGetAccountListFailure = () => ({
	type: SET_ACCOUNT_LIST,
	payload: []
});

export const getAccountListAction = () => (dispatch) => {
	const apiUrl = '/api/getAccountList';

	return fetch(apiUrl)
		.then(res => res.json())
		.then(body => dispatch(fetchGetAccountListSuccess(body)))
		.catch(ex => dispatch(fetchGetAccountListFailure(ex)));
};
