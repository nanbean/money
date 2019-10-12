import * as actions from '../../actions/actionTypes';

const initialState = false;

export default function fetching (state = initialState, action) {
	switch (action.type) {
	case actions.SET_ADD_TRANSACTION_FETCHING:
		return action.payload;
	case actions.SET_ADD_TRANSACTION_RESULT:
		return false;
	default:
		return state;
	}
}
