import * as actions from '../actions/actionTypes';

const initialState = [];

export default function sp500Benchmark (state = initialState, action) {
	switch (action.type) {
	case actions.SET_SP500_BENCHMARK:
		if (Array.isArray(action.payload)) {
			return action.payload;
		}
		return state;
	default:
		return state;
	}
}
