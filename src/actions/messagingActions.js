import { getToken, deleteToken } from 'firebase/messaging';

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

export const requestPermissionAction = () => {
	return async dispatch => {
		const permission = await Notification.requestPermission();

		if (permission === 'granted') {
		  const messagingToken = await getToken(messaging, {
				vapidKey: process.env.REACT_APP_VAPID_KEY
		  });

			const apiUrl = '/api/registerMessageToken';
			const response = await fetch(apiUrl, {
				method: 'POST',
				headers: {
					'Accept': 'application/json, text/plain, */*',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ messagingToken })
			});

			const result = await response.json();

			if (result.return === true) {
				dispatch(getTokenSuccess(messagingToken));
			} else {
				dispatch(getTokenFailure());
			}
		}
	};
};

export const deleteTokenSuccess = () => ({
	type: SET_MESSAGING_TOKEN,
	payload: ''
});

export const deleteTokenFailure = () => ({
	type: SET_MESSAGING_TOKEN,
	payload: ''
});

export const removePermissionAction = (messagingToken) => {
	return async dispatch => {
		const success = await deleteToken(messaging);

		if (success) {
			const apiUrl = '/api/unRegisterMessageToken';

			const response = await fetch(apiUrl, {
				method: 'POST',
				headers: {
					'Accept': 'application/json, text/plain, */*',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ messagingToken })
			});

			const result = await response.json();

			if (result.return === true) {
				dispatch(deleteTokenSuccess(messagingToken));
			} else {
				dispatch(deleteTokenFailure());
			}
		}
	};
};
