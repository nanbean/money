import * as actions from '../actions/actionTypes';

const initialState = [];

export default function dropPayeeList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_PAYEE_LIST:
		if (action.payload) {
			return action.payload.map(i => ({ key: i, name: i }));
		} else {
			return state;
		}
	default:
		return state;
	}
}
