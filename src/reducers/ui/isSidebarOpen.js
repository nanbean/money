import * as actions from '../../actions/actionTypes';

const initialState = false;

export default function isSidebarOpen (state = initialState, action) {
	switch (action.type) {
	case actions.TOGGLE_SIDEBAR:
		if (typeof window === 'object') {
			try {
				window.localStorage.setItem('isSidebarOpen', !state);
			} catch (err) {
				// no action
			}
		}
		return !state;
	case actions.REHYDRATE:
		if (action.payload && action.payload.isSidebarOpen) {
			return action.payload.isSidebarOpen;
		}
		return state;
	default:
		return state;
	}
}
