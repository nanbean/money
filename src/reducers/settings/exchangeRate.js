import * as actions from '../../actions/actionTypes';

const initialState = 1300;

export default function exchangeRate (state = initialState, action) {
	switch (action.type) {
	case actions.SET_SETTINGS: {
		const exchangeRate = action.payload.find(i => i._id === 'exchangeRate');
		if (exchangeRate && exchangeRate.dollorWon) {
			return exchangeRate.dollorWon;
		}
		return state;
	}
	default:
		return state;
	}
}
