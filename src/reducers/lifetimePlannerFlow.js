import * as actions from '../actions/actionTypes';

const initialState = { data: [], events: [] };

export default function lifetimePlannerFlow (state = initialState, action) {
	switch (action.type) {
	case actions.SET_LIFETIME_PLANNER_FLOW:
		if (action.payload) {
			if (Array.isArray(action.payload)) {
				return { data: action.payload, events: [] };
			}
			return action.payload;
		}
		return state;
	default:
		return state;
	}
}
