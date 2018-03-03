import { getAccountListAction } from './accountActions';

import {
	SET_INVESTMENT_PRICE,
	SET_UPDATE_INVESTMENT_PRICE_FETCHING
} from './actionTypes';

export const fetchGetInvestmentPriceSuccess = params => ({
	type: SET_INVESTMENT_PRICE,
	payload: params
});

export const fetchGetInvestmentPriceFailure = params => ({
	type: SET_INVESTMENT_PRICE,
	payload: []
});

export const getInvestmentPriceAction = (investment) => (dispatch) => {
	if (investment) {
		const apiUrl = `/api/getInvestmentPrice?investment=${investment}`;

		return fetch(apiUrl)
		.then(res => res.json())
		.then(body => dispatch(fetchGetInvestmentPriceSuccess(body)))
		.catch(ex => dispatch(fetchGetInvestmentPriceFailure(ex)))
	}
};

export const getInvestmentPriceFetching = params => ({
	type: SET_UPDATE_INVESTMENT_PRICE_FETCHING,
	payload: params
});

export const updateInvestmentPriceAction = () => (dispatch) => {
	const apiUrl = '/api/updateInvestmentPrice';

	dispatch(getInvestmentPriceFetching(true));
	return fetch(apiUrl)
	.then(res => res.json())
	.then(body => {
		if (body.return) {
			dispatch(getAccountListAction());
			dispatch(getInvestmentPriceFetching(false));
		}
	})
	.catch(ex => console.log(ex));
};
