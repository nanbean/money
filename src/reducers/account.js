import * as actions from '../actions/actionTypes';

const initialState = '';

export default function account (state = initialState, action) {
	switch (action.type) {
	// case actions.SET_BANK_TRANSACTIONS:
	// case actions.SET_INVESTMENT_ACCOUNT_TRANSACTIONS:
	// 	return action.payload.account;
	case actions.SET_ACCOUNT:
		return action.payload;
	default:
		return state;
	}
}
