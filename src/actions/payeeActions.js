import {
	SET_PAYEE_LIST
} from './actionTypes';

export const fetchGetPayeeListSuccess = params => ({
	type: SET_PAYEE_LIST,
	payload: params
});

export const fetchGetPayeeListFailure = params => ({
	type: SET_PAYEE_LIST,
	payload: []
});

export const getPayeeListAction = () => (dispatch) => {
	const apiUrl = '/api/getPayeeList';

	return fetch(apiUrl)
	.then(res => res.json())
	.then(body => dispatch(fetchGetPayeeListSuccess(body)))
	.catch(ex => dispatch(fetchGetPayeeListFailure(ex)))
};
