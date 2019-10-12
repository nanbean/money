import * as actions from '../actions/actionTypes';

const initialState = '';

export default function username (state = initialState, action) {
	switch (action.type) {
	case actions.SET_USERNAME:
		if (typeof window === 'object') {
			try {
				window.localStorage.setItem('username', action.payload);
			} catch (err) {
				// no action
			}
		}
		return action.payload;
	case actions.REHYDRATE:
		if (action.payload && action.payload.username) {
			return action.payload.username;
		}
		return state;
	default:
		return state;
	}
}
