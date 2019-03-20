import * as actions from '../actions/actionTypes';

const initialState = [];

export default function notifications (state = initialState, action) {
	switch (action.type) {
	case actions.SET_NOTIFICATION_HISTORY:
		if (action.body) {
			return action.body;
		} else {
			return state;
		}
	default:
		return state;
	}
}
