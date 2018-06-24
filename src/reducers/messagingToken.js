import * as actions from '../actions/actionTypes';

const initialState = '';

export default function messagingToken (state = initialState, action) {
	switch (action.type) {
	case actions.SET_MESSAGING_TOKEN:
		if (typeof window === 'object') {
			try {
				window.localStorage.setItem('messagingToken', action.payload);
			} catch (err) {
				// no action
			}
		}
		return action.payload;
	case actions.REHYDRATE:
		if (action.payload && action.payload.messagingToken) {
			return action.payload.messagingToken;
		}
		return state;
	default:
		return state;
	}
}
