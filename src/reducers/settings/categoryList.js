import * as actions from '../../actions/actionTypes';

const initialState = [];

export default function categoryList (state = initialState, action) {
	switch (action.type) {
	case actions.SET_SETTINGS: {
		const categoryList = action.payload.find(i => i._id === 'categoryList');
		if (categoryList && categoryList.data) {
            return categoryList.data.map(i => ({ key: i, value: i, text: i }));
		}
		return state;
	}
	default:
		return state;
	}
}