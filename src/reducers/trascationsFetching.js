import * as actions from '../actions/actionTypes';

const initialState = true;

export default function trascationsFetching (state = initialState, action) {
	switch (action.type) {
	case actions.SET_TRANSACTIONS_FETCHING:
		return action.payload;
	default:
		return state;
	}
}
