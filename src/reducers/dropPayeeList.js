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
	case actions.ADD_OR_EDIT_ALL_ACCOUNTS_TRANSACTIONS:
		if (action.payload) {
			const index = state.findIndex(i => i.name === action.payload.payee);
			if (index < 0) {
				return [...state, { key: action.payload.payee, name: action.payload.payee }];
			}
		}
		return state;
	default:
		return state;
	}
}
