import {
	SET_FILTERED_INVESTMENTS
} from './actionTypes';

export const setfilteredInvestments = params => (dispatch) => {
	dispatch({
		type: SET_FILTERED_INVESTMENTS,
		payload: params
	});
};