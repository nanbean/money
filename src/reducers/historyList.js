import * as actions from '../actions/actionTypes';

const initialState = [];

export default function historyList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_HISTORY_LIST:
		if (action.payload) {
			return action.payload;
		} else {
			return state;
		}
	default:
		return state;
	}
}
