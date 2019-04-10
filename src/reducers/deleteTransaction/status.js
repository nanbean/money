import * as actions from '../../actions/actionTypes';

const initialState = '';

export default function status (state = initialState, action) {
	switch (action.type) {
	case actions.SET_DELETE_TRANSACTION_RESULT:
		if (action.body) {
			return 200;
		} else if (action.ex) {
			return action.ex.status;
		} else {
			return state;
		}
	default:
		return state;
	}
}
