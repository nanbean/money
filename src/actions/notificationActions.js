import {
	SET_NOTIFICATION_HISTORY
} from './actionTypes';

export const fetchGetNotificationHistorySuccess = body => ({
	type: SET_NOTIFICATION_HISTORY,
	body
});

export const fetchGetNotificationHistoryFailure = () => ({
	type: SET_NOTIFICATION_HISTORY,
	payload: []
});

export const getNotificationsAction = () => (dispatch) => {
	const apiUrl = '/api/notifications?size=20';

	return fetch(apiUrl)
		.then(res => res.json())
		.then(body => dispatch(fetchGetNotificationHistorySuccess(body)))
		.catch(ex => dispatch(fetchGetNotificationHistoryFailure(ex)));
};
