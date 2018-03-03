import * as actions from '../actions/actionTypes'

const initialState = '';

export default function bank (state = initialState, action) {
	switch (action.type) {
	case actions.SET_BANK:
		return action.payload;
	default:
		return state;
	}
}
