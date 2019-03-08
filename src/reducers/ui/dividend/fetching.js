import * as actions from '../../../actions/actionTypes';

const initialState = false;

export default function fetching (state = initialState, action) {
	switch (action.type) {
	case actions.SET_DIVIDEND_FETCHING:
		return action.payload;
	default:
		return state;
	}
}
