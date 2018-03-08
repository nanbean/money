import * as actions from '../actions/actionTypes';

const initialState = [];

export default function payeeList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_PAYEE_LIST:
		return action.payload.list;
	default:
		return state;
	}
}
