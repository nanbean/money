import * as actions from '../../actions/actionTypes';

const initialState = [];

export default function weeklyGraphAccount (state = initialState, action) {
	switch (action.type) {
	case actions.SET_SETTINGS: {
		const weeklyGraphAccount = action.payload.find(i => i._id === 'weeklyGraphAccount');
		if (weeklyGraphAccount && weeklyGraphAccount.data) {
			return weeklyGraphAccount.data;
		}
		return state;
	}
	default:
		return state;
	}
}