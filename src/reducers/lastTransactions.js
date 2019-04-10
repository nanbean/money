import * as actions from '../actions/actionTypes';

const initialState = [];

export default function lastTransactions (state = initialState, action) {
	switch (action.type) {
	case actions.SET_LAST_TRANSACTIONS:
		if (action.payload && Array.isArray(action.payload)) {
			return action.payload;
		} else {
			return state;
		}
	default:
		return state;
	}
}
