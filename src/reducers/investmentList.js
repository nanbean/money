import * as actions from '../actions/actionTypes';

const initialState = [];

export default function investmentList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_ALL_INVESTMENTS:
		return action.payload.map(i => ({ name: i.name, symbol: i.googleSymbol ? i.googleSymbol.split(':')[1] : '' }));
	default:
		return state;
	}
}
