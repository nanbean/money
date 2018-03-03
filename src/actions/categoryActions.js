import {
	SET_CATEGORY_LIST
} from './actionTypes';

export const fetchGetCategoryListSuccess = params => ({
	type: SET_CATEGORY_LIST,
	payload: params
});

export const fetchGetCategoryListFailure = params => ({
	type: SET_CATEGORY_LIST,
	payload: []
});

export const getCategoryListAction = () => (dispatch) => {
	const apiUrl = '/api/getCategoryList';

	return fetch(apiUrl)
	.then(res => res.json())
	.then(body => dispatch(fetchGetCategoryListSuccess(body)))
	.catch(ex => dispatch(fetchGetCategoryListFailure(ex)))
};
