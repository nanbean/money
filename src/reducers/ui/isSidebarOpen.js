import * as actions from '../../actions/actionTypes';

const initialState = false;

export default function isSidebarOpen (state = initialState, action) {
	switch (action.type) {
	case actions.TOGGLE_SIDEBAR:
		return !state;
	default:
		return state;
	}
}
