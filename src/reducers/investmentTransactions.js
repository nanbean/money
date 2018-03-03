import * as actions from '../actions/actionTypes'

const initialState = [];

export default function investmentTransactions (state = initialState, action) {
	switch (action.type) {
	case actions.SET_INVESTMENT_TRANSACTIONS:
		if (action.payload.transactions) {
			return action.payload.transactions;
		}
		return state;
	default:
		return state;
	}
}
