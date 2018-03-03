import * as actions from '../actions/actionTypes'

const initialState = [];

export default function accountList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_ACCOUNT_LIST:
		if (action.payload.list) {
			return action.payload.list;
		}
		return state;
	default:
		return state;
	}
}
