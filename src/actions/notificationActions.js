import {
	SET_NOTIFICATION_HISTORY
} from './actionTypes';

export const fetchGetNotificationHistorySuccess = params => ({
	type: SET_NOTIFICATION_HISTORY,
	payload: params
});

export const fetchGetNotificationHistoryFailure = () => ({
	type: SET_NOTIFICATION_HISTORY,
	payload: []
});

export const getNotificationHistoryAction = () => (dispatch) => {
	const apiUrl = '/api/getNotificationHistory';

	return fetch(apiUrl)
		.then(res => res.json())
		.then(body => dispatch(fetchGetNotificationHistorySuccess(body.history)))
		.catch(ex => dispatch(fetchGetNotificationHistoryFailure(ex)));
};
