import * as actions from '../../actions/actionTypes';

const initialState = true;

export default function enableExchangeRateUpdate (state = initialState, action) {
	switch (action.type) {
	case actions.SET_SETTINGS: {
		const enableExchangeRateUpdate = action.payload.find(i => i._id === 'enableExchangeRateUpdate');
		if (enableExchangeRateUpdate) {
			return enableExchangeRateUpdate.value;
		}
		return state;
	}
	default:
		return state;
	}
}
