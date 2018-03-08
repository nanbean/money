import * as actions from '../actions/actionTypes';

const initialState = {};

export default function allAccountTransactions (state = initialState, action) {
	switch (action.type) {
	case actions.SET_ALL_ACCOUNT_TRANSACTIONS:
		if (action.payload) {
			return action.payload;
		} else {
			return state;
		}
	default:
		return state;
	}
}
