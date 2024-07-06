import {
	SET_ACCOUNT
} from './actionTypes';

export const setAccountAction = params => ({
	type: SET_ACCOUNT,
	payload: params
});