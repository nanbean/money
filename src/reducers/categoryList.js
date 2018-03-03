import * as actions from '../actions/actionTypes'

const initialState = [];

export default function categoryList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_CATEGORY_LIST:
		return action.payload.list;
	default:
		return state;
	}
}
