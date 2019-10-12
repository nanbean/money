import * as actions from '../actions/actionTypes';

const initialState = [];

export default function dropInvestmentList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_ALL_INVESTMENTS:
		return action.payload.map(i => ({ name: i.name, key: i.yahooSymbol.split('.')[0] }));
	default:
		return state;
	}
}
