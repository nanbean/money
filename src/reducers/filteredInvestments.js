import * as actions from '../actions/actionTypes';

const initialState = [
	'ACE 테슬라밸류체인액티브',
	'TIGER 테슬라채권혼합Fn',
	'TSLA'
];

export default function filteredInvestments (state = initialState, action) {
	switch (action.type) {
	case actions.SET_FILTERED_INVESTMENTS:
		return action.payload;
	default:
		return state;
	}
}
