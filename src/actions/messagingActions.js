import {
	SET_MESSAGING_TOKEN
} from './actionTypes';
import messaging from '../service/messaging';

export const getTokenSuccess = params => ({
	type: SET_MESSAGING_TOKEN,
	payload: params
});

export const getTokenFailure = () => ({
	type: SET_MESSAGING_TOKEN,
	payload: ''
});

export const requestPermissionAction = () => (dispatch) => {
	return messaging.requestPermission()
		.then(() => messaging.getToken())
		.then(messagingToken => {
			if (messagingToken) {
				const apiUrl = '/api/registerMessageToken';

				return fetch(apiUrl, {
					method: 'POST',
					headers: {
						'Accept': 'application/json, text/plain, */*',
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({messagingToken})
				})
					.then(res => res.json())
					.then(body => {
						if (body.return === true) {
							dispatch(getTokenSuccess(messagingToken));
						}
					})
					.catch(() => dispatch(getTokenFailure()));
			}
		})
		.catch(() => dispatch(getTokenFailure()));
};

export const deleteTokenSuccess = () => ({
	type: SET_MESSAGING_TOKEN,
	payload: ''
});

export const deleteTokenFailure = () => ({
	type: SET_MESSAGING_TOKEN,
	payload: ''
});

export const removePermissionAction = () => (dispatch, getState) => {
	const state = getState();
	const {messagingToken} = state;
	return messaging.deleteToken(messagingToken)
		.then(() => {
			if (messagingToken) {
				const apiUrl = '/api/unRegisterMessageToken';

				return fetch(apiUrl, {
					method: 'POST',
					headers: {
						'Accept': 'application/json, text/plain, */*',
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({messagingToken})
				})
					.then(res => res.json())
					.then(body => {
						if (body.return === true) {
							dispatch(deleteTokenSuccess());
						}
					})
					.catch(() => dispatch(deleteTokenFailure()));
			}
		})
		.catch(() => dispatch(deleteTokenFailure()));
};
