import * as actions from '../actions/actionTypes';

const initialState = [];

export default function xlsTransactions (state = initialState, action) {
	switch (action.type) {
	case actions.SET_XLS_TRANSACTIONS:
		if (action.payload) {
			return action.payload;
		} else {
			return state;
		}
	case actions.EDIT_XLS_TRANSACTION:
		return [
			...state.slice(0, action.payload.index),
			action.payload.transaction,
			...state.slice(action.payload.index + 1)
		];
	case actions.DELETE_XLS_TRANSACTION:
		return [
			...state.slice(0, action.payload.index),
			...state.slice(action.payload.index + 1)
		];
	default:
		return state;
	}
}
