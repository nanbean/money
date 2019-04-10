import * as actions from '../actions/actionTypes';

const initialState = [];

export default function categoryList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_CATEGORY_LIST:
		if (action.payload.list) {
			return action.payload.list;
		} else {
			return state;
		}
	default:
		return state;
	}
}
