import * as actions from '../actions/actionTypes';

const initialState = '';

export default function account (state = initialState, action) {
	switch (action.type) {
	case actions.SET_BANK_TRANSACTION:
		return action.payload.data.type;
	default:
		return state;
	}
}
