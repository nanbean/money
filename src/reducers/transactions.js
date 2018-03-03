import * as actions from '../actions/actionTypes'

const initialState = [];

export default function transactions (state = initialState, action) {
	switch (action.type) {
	case actions.SET_BANK_TRANSACTIONS:
		return action.payload.data.transactions;
	default:
		return state;
	}
}
