import * as actions from '../../actions/actionTypes';

const initialState = {};

export default function general (state = initialState, action) {
	switch (action.type) {
	case actions.SET_SETTINGS: {
		const general = action.payload.find(i => i._id === 'general');
		if (general) {
			return general;
		}
		return state;
	}
	default:
		return state;
	}
}
