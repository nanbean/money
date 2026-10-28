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

// size: 최신순으로 몇 개를 받을지. 화면의 '더 보기'가 늘려서 다시 부른다(서버 상한 500).
export const getNotificationsAction = (size = 20) => (dispatch) => {
	const apiUrl = `/api/notifications?size=${size}`;

	return fetch(apiUrl)
		.then(res => res.json())
		.then(body => dispatch(fetchGetNotificationHistorySuccess(body)))
		.catch(ex => dispatch(fetchGetNotificationHistoryFailure(ex)));
};
