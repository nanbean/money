import {
	SET_ALL_DIVIDENDS,
	SET_DIVIDEND_FETCHING
} from './actionTypes';

const setDividendFetching = payload => ({
	type: SET_DIVIDEND_FETCHING,
	payload
});

export const fetchGetAllDividendsSuccess = params => ({
	type: SET_ALL_DIVIDENDS,
	payload: params
});

export const fetchGetAllDividendsFailure = () => ({
	type: SET_ALL_DIVIDENDS,
	payload: []
});

export const getAllDividendsAction = (start, end) => (dispatch) => {
	const apiUrl = `/api/dividends${start ? '?start=' + start : ''}${end ? '&end=' + end : ''}`;

	dispatch(setDividendFetching(true));

	return fetch(apiUrl)
		.then(res => res.json())
		.then(body => {
			dispatch(setDividendFetching(false));
			dispatch(fetchGetAllDividendsSuccess(body));
		})
		.catch(ex => {
			dispatch(setDividendFetching(false));
			dispatch(fetchGetAllDividendsFailure(ex));
		});
};
