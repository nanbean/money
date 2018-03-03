import * as actions from '../actions/actionTypes'

const initialState = '';

export default function loginId (state = initialState, action) {
	switch (action.type) {
	case actions.SET_LOGIN_ID:
		return action.payload;
	default:
		return state;
	}
}
