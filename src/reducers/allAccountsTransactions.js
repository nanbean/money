import * as actions from '../actions/actionTypes';

const initialState = [];

export default function allAccountsTransactions (state = initialState, action) {
	switch (action.type) {
	case actions.SET_ALL_ACCOUNTS_TRANSACTIONS:
		if (action.payload) {
			return action.payload;
		} else {
			return state;
		}
	case actions.ADD_ALL_ACCOUNTS_TRANSACTIONS:
		return [
			...state,
			action.payload
		];
	case actions.DELETE_ALL_ACCOUNTS_TRANSACTIONS:
		return state.filter(i => i._id !== action.payload);
	case actions.EDIT_ALL_ACCOUNTS_TRANSACTIONS:
		return state.map(i => {
			if (i._id === action.payload._id) {
				return { ...i, ...action.payload };
			}
			return i;
		});
	case actions.ADD_OR_EDIT_ALL_ACCOUNTS_TRANSACTIONS: {
		const index = state.findIndex(i => i._id === action.payload._id);

		if (index > -1) {
			return state.map(i => {
				if (i._id === action.payload._id) {
					return { ...i, ...action.payload };
				}
				return i;
			});
		} else {
			return [
				...state,
				action.payload
			];
		}
	}
	default:
		return state;
	}
}
