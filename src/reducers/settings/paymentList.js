import * as actions from '../../actions/actionTypes';

const initialState = [];

export default function paymentList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_SETTINGS: {
		const paymentList = action.payload.find(i => i._id === 'paymentList');
		if (paymentList && paymentList.data) {
			return paymentList.data;
		}
		return state;
	}
	default:
		return state;
	}
}