import {
	SET_LIFETIME_PLANNER_FLOW
} from './actionTypes';

export const fetchGetLifetimeFlowSuccess = params => ({
	type: SET_LIFETIME_PLANNER_FLOW,
	payload: params
});

export const fetchGetLifetimeFlowFailure = params => ({
	type: SET_LIFETIME_PLANNER_FLOW,
	payload: {}
});

export const getLifetimeFlowAction = () => (dispatch) => {
	const apiUrl = '/api/getLifetimeFlow';

	return fetch(apiUrl)
	.then(res => res.json())
	.then(body => {
		if (body.count) {
			dispatch(fetchGetLifetimeFlowSuccess(body));
		}
	})
	.catch(ex => dispatch(fetchGetLifetimeFlowFailure(ex)));
};
