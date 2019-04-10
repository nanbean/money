import * as actions from '../actions/actionTypes';

const initialState = [];

export default function dropCategoryList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_CATEGORY_LIST:
		if (action.payload.list) {
			return action.payload.list.map(i => ({ key: i, value: i, text: i }));
		} else {
			return state;
		}
	default:
		return state;
	}
}
