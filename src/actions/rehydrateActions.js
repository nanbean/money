import {
	REHYDRATE
} from './actionTypes';

export const rehydrateAction = () => {
	const payload = {};

	if (typeof window === 'object') {
		try {
			const messagingToken = window.localStorage.getItem('messagingToken');
			payload.messagingToken = messagingToken;
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
