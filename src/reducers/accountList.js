import * as actions from '../actions/actionTypes';

const initialState = [];

export default function accountList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_ACCOUNT_LIST:
		if (action.payload) {
			return action.payload;
		}
		return state;
	default:
		return state;
	}
}
