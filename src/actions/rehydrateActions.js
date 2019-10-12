import {
	REHYDRATE
} from './actionTypes';

export const rehydrateAction = () => {
	const payload = {};

	if (typeof window === 'object') {
		try {
			const messagingToken = window.localStorage.getItem('messagingToken');
			payload.messagingToken = messagingToken;

			const username = window.localStorage.getItem('username');
			payload.username = username;

			const isSidebarOpen = window.localStorage.getItem('isSidebarOpen');
			payload.isSidebarOpen = isSidebarOpen === 'true';
		} catch (err) {
			// do nothing
		}
	} else {
		// do nothing
	}
	return {
		type: REHYDRATE,
		payload
	};
};
