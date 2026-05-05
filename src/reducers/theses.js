import * as actions from '../actions/actionTypes';

const initialState = [];

export default function theses (state = initialState, action) {
	switch (action.type) {
	case actions.SET_THESES:
		if (Array.isArray(action.payload)) {
			return action.payload;
		}
		return state;
	default:
		return state;
	}
}
