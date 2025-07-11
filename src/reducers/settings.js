import * as actions from '../actions/actionTypes';

const initialState = {
	currency: 'KRW',
	enableExchangeRateUpdate: true,
	exchangeRate: 1300
};

export default function settings (state = initialState, action) {
	switch (action.type) {
	case actions.SET_SETTINGS: {
		const general = action.payload.reduce((obj, item) => {
			obj[item._id] = item.value;
			return obj;
		}, {});
		if (general) {
			return general;
		}
		return state;
	}
	default:
		return state;
	}
}
