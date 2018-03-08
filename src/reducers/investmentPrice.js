import * as actions from '../actions/actionTypes';

const initialState = 0;

export default function investmentPrice (state = initialState, action) {
	switch (action.type) {
	case actions.SET_INVESTMENT_PRICE:
		if (action.payload.price) {
			return action.payload.price;
		} else {
			return state;
		}
	default:
		return state;
	}
}
