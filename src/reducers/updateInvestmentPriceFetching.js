import * as actions from '../actions/actionTypes'

const initialState = false;

export default function updateInvestmentPriceFetching (state = initialState, action) {
	switch (action.type) {
	case actions.SET_UPDATE_INVESTMENT_PRICE_FETCHING:
		return action.payload;
	default:
		return state;
	}
}
