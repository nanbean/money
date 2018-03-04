import * as actions from '../actions/actionTypes';

const initialState = false;

export default function allInvestmentsFiltered (state = initialState, action) {
	switch (action.type) {
	case actions.SET_ALL_INVESTMENTS_FILTERED:
		return action.payload;
	default:
		return state;
	}
}
