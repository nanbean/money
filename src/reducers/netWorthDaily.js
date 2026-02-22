import * as actions from '../actions/actionTypes';

const initialState = [];

export default function netWorthDaily (state = initialState, action) {
	switch (action.type) {
	case actions.SET_NET_WORTH_DAILY:
		if (action.payload) {
			return action.payload;
		}
		return state;
	default:
		return state;
	}
}
