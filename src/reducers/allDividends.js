import * as actions from '../actions/actionTypes';

const initialState = [];

export default function allDividends (state = initialState, action) {
	switch (action.type) {
	case actions.SET_ALL_DIVIDENDS:
		if (action.payload && Array.isArray(action.payload)) {
			return action.payload;
		}
		return state;
	default:
		return state;
	}
}
