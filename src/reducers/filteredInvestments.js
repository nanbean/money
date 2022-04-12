import * as actions from '../actions/actionTypes';

const initialState = [
	'한국조선해양',
	'HD현대',
	'현대일렉트릭',
	'현대건설기계',
	'현대중공업'
];

export default function filteredInvestments (state = initialState, action) {
	switch (action.type) {
	case actions.SET_FILTERED_INVESTMENTS:
		return action.payload;
	default:
		return state;
	}
}
