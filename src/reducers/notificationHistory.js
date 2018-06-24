import * as actions from '../actions/actionTypes';

const initialState = [];

export default function notificationHistory (state = initialState, action) {
	switch (action.type) {
	case actions.SET_NOTIFICATION_HISTORY:
		return action.payload;
	default:
		return state;
	}
}
