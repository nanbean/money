import * as actions from '../actions/actionTypes'

const initialState = [];

export default function lifetimePlannerFlow (state = initialState, action) {
	switch (action.type) {
	case actions.SET_LIFETIME_PLANNER_FLOW:
		if (action.payload.list) {
		return action.payload.list;
	}
	return state;
	default:
		return state;
	}
}
