import * as actions from '../actions/actionTypes'

const initialState = [];

export default function accountInvestments (state = initialState, action) {
	switch (action.type) {
	case actions.SET_ACCOUNT_INVESTMENTS:
		if (action.payload.investments) {
			return action.payload.investments;
		}
		return state;
	default:
		return state;
	}
}
