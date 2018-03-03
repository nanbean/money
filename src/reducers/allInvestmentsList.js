import * as actions from '../actions/actionTypes'

const initialState = [];

export default function allInvestmentsList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_ALL_INVESTMENTS_PRICE:
		if (action.payload) {
			return action.payload.map(i => i.investment);
		} else {
			return state;
		}
	default:
		return state;
	}
}
