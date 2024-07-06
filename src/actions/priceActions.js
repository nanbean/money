import {
	SET_UPDATE_INVESTMENT_PRICE_FETCHING
} from './actionTypes';

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
				dispatch(getInvestmentPriceFetching(false));
			}
		})
		.catch();
};
