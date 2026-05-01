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
		try {
			if (typeof Notification === 'undefined') {
				console.error('[push] Notification API not available (iOS <16.4 or non-secure context)');
				alert('이 브라우저/OS는 푸시 알림을 지원하지 않습니다.\niOS는 16.4 이상 + 홈 화면에서 실행 필요.');
				dispatch(getTokenFailure());
				return;
			}

			console.log('[push] requesting permission, current=', Notification.permission);
			const permission = await Notification.requestPermission();
			console.log('[push] permission result=', permission);

			if (permission !== 'granted') {
				alert(`푸시 알림 권한이 거부되었습니다 (${permission}).`);
				dispatch(getTokenFailure());
				return;
			}

			const reg = await navigator.serviceWorker.ready;
			console.log('[push] service worker ready, scope=', reg.scope);

			const messagingToken = await getToken(messaging, {
				vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
				serviceWorkerRegistration: reg
			});
			console.log('[push] FCM token=', messagingToken ? messagingToken.slice(0, 20) + '...' : '(empty)');

			if (!messagingToken) {
				alert('FCM 토큰을 받지 못했습니다. SW 또는 VAPID 키 설정을 확인하세요.');
				dispatch(getTokenFailure());
				return;
			}

			const response = await fetch('/api/registerMessageToken', {
				method: 'POST',
				headers: {
					'Accept': 'application/json, text/plain, */*',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ messagingToken })
			});

			const result = await response.json();
			console.log('[push] register result=', result);

			if (result.return === true) {
				dispatch(getTokenSuccess(messagingToken));
			} else {
				dispatch(getTokenFailure());
			}
		} catch (err) {
			console.error('[push] requestPermission error:', err);
			alert(`Push 등록 실패: ${err && err.message ? err.message : err}`);
			dispatch(getTokenFailure());
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

export const autoRefreshTokenAction = () => {
	return async dispatch => {
		const savedToken = window.localStorage.getItem('messagingToken');
		if (!savedToken) {
			return;
		}

		const permission = Notification.permission;
		if (permission !== 'granted') {
			return;
		}

		try {
			const currentToken = await getToken(messaging, {
				vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
			});

			if (!currentToken || currentToken === savedToken) {
				return;
			}

			await fetch('/api/registerMessageToken', {
				method: 'POST',
				headers: {
					'Accept': 'application/json, text/plain, */*',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ messagingToken: currentToken, oldToken: savedToken })
			});

			dispatch(getTokenSuccess(currentToken));
		} catch (error) {
			console.error('autoRefreshToken error:', error);
		}
	};
};

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
