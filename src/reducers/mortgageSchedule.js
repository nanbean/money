import * as actions from '../actions/actionTypes'

const initialState = [];

export default function mortgageSchedule (state = initialState, action) {
	switch (action.type) {
	case actions.SET_MORTAGE_SCHEDULE:
		return action.payload.schedule;
	default:
		return state;
	}
}
