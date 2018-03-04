import * as actions from '../actions/actionTypes';

const initialState = [];

export default function allInvestmentsTransactions (state = initialState, action) {
	switch (action.type) {
	case actions.SET_ALL_INVESTMENTS_TRANSACTIONS:
		return action.payload;
	default:
		return state;
	}
}
