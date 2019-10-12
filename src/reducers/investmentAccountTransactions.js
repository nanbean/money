import * as actions from '../actions/actionTypes';

const initialState = [];

export default function investmentAccountTransactions (state = initialState, action) {
	switch (action.type) {
	case actions.SET_INVESTMENT_ACCOUNT_TRANSACTIONS:
		return action.payload;
	default:
		return state;
	}
}
