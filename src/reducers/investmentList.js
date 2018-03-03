import * as actions from '../actions/actionTypes'

const initialState = [];

export default function investmentList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_INVESTMENT_LIST:
		return action.payload.list;
	default:
		return state;
	}
}
