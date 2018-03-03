import {
	SET_NET_WORTH
} from './actionTypes';

export const fetchGetNetWorthSuccess = params => ({
	type: SET_NET_WORTH,
	payload: params
});

export const fetchGetNetWorthFailure = params => ({
	type: SET_NET_WORTH,
	payload: {}
});

export const getNetWorthAction = () => (dispatch) => {
	const apiUrl = '/api/getNetWorth';

	return fetch(apiUrl)
	.then(res => res.json())
	.then(body => {
		if (body.count) {
			dispatch(fetchGetNetWorthSuccess(body));
		}
	})
	.catch(ex => dispatch(fetchGetNetWorthFailure(ex)));
};
