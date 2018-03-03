import * as actions from '../actions/actionTypes'

const initialState = [];

export default function netWorth (state = initialState, action) {
	switch (action.type) {
	case actions.SET_NET_WORTH:
		if (action.payload.list) {
		return action.payload.list;
	}
	return state;
	default:
		return state;
	}
}
