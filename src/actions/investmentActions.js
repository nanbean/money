import { getAccountListAction } from './accountActions';

import {
	SET_INVESTMENT_LIST,
	SET_ALL_INVESTMENTS_TRANSACTIONS,
	SET_ALL_INVESTMENTS_PRICE,
	SET_FILTERED_INVESTMENTS,
	SET_ALL_INVESTMENTS_FILTERED,
	SET_INVESTMENT_PRICE,
	SET_INVESTMENT_TRANSACTIONS,
	SET_INVESTMENT_ACCOUNT_TRANSACTIONS,
	SET_ACCOUNT_INVESTMENTS
} from './actionTypes';

const fetchGetInvestmentListSuccess = params => ({
	type: SET_INVESTMENT_LIST,
	payload: params
});

const fetchGetInvestmentListFailure = params => ({
	type: SET_INVESTMENT_LIST,
	payload: []
});

export const getInvestmentListAction = () => (dispatch) => {
	const apiUrl = '/api/getInvestmentList';

	return fetch(apiUrl)
	.then(res => res.json())
	.then(body => dispatch(fetchGetInvestmentListSuccess(body)))
	.catch(ex => dispatch(fetchGetInvestmentListFailure(ex)))
};

const fetchGetAllInvestmentsTransactionsSuccess = params => ({
	type: SET_ALL_INVESTMENTS_TRANSACTIONS,
	payload: params
});

const fetchGetAllInvestmentsTransactionsFailure = params => ({
	type: SET_ALL_INVESTMENTS_TRANSACTIONS,
	payload: []
});

export const getAllInvestmentsTransactionsAction = () => (dispatch) => {
	const apiUrl = `/api/getAllInvestmentsTransactions`;

	return fetch(apiUrl)
	.then(res => res.json())
	.then(body => dispatch(fetchGetAllInvestmentsTransactionsSuccess(body)))
	.catch(ex => dispatch(fetchGetAllInvestmentsTransactionsFailure(ex)))
};

const fetchGetAllInvestmentsPriceSuccess = params => ({
	type: SET_ALL_INVESTMENTS_PRICE,
	payload: params
});

const fetchGetAllInvestmentsPriceFailure = params => ({
	type: SET_ALL_INVESTMENTS_PRICE,
	payload: []
});

export const getAllInvestmentsPriceAction = () => (dispatch) => {
	const apiUrl = `/api/getAllInvestmentsPrice`;

	return fetch(apiUrl)
	.then(res => res.json())
	.then(body => dispatch(fetchGetAllInvestmentsPriceSuccess(body)))
	.catch(ex => dispatch(fetchGetAllInvestmentsPriceFailure(ex)))
};

const fetchInvestmentAccountTransactionsSuccess = params => ({
	type: SET_INVESTMENT_ACCOUNT_TRANSACTIONS,
	payload: params
});

const fetchGetInvestmentAccountTransactionsFailure = params => ({
	type: SET_INVESTMENT_ACCOUNT_TRANSACTIONS,
	payload: []
});

export const getInvestmentAccountTransactionsAction = (account) => (dispatch) => {
	if (account) {
		const apiUrl = `/api/getInvestmentAccountTransactions?account=${account}`;

		return fetch(apiUrl)
		.then(res => res.json())
		.then(body => dispatch(fetchInvestmentAccountTransactionsSuccess(body)))
		.catch(ex => dispatch(fetchGetInvestmentAccountTransactionsFailure(ex)))
	}
};

const resetAccountInvestments = () => ({
	type: SET_ACCOUNT_INVESTMENTS,
	payload: {
		investments: []
	}
});

const fetchGetAccountInvestmentsSuccess = params => ({
	type: SET_ACCOUNT_INVESTMENTS,
	payload: params
});

const fetchGetAccountInvestmentsFailure = params => ({
	type: SET_ACCOUNT_INVESTMENTS,
	payload: {}
});


export const getAccountInvestmentsAction = (account) => (dispatch) => {
	if (account) {
		resetAccountInvestments();

		const apiUrl = `/api/getAccountInvestments?account=${account}`;

		return fetch(apiUrl)
		.then(res => res.json())
		.then(body => dispatch(fetchGetAccountInvestmentsSuccess(body)))
		.catch(ex => dispatch(fetchGetAccountInvestmentsFailure(ex)))
	}
};

export const addInvestmentTransactionAction = (data) => (dispatch) => {
	if (data) {
		const apiUrl = '/api/addInvestmentTransaction';

		return fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		})
		.then(res => res.json())
		.then(body => {
			if (body.return === true) {
				dispatch(getInvestmentAccountTransactionsAction(data.account));
				dispatch(getAccountInvestmentsAction(data.account));
				dispatch(getAccountListAction());
			}
		})
		.catch(ex => console.log(ex))
	}
};

export const deleteInvestmentTransactionAction = (data) => (dispatch) => {
	if (data) {
		const apiUrl = '/api/deleteInvestmentTransaction';

		return fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		})
		.then(res => res.json())
		.then(body => {
			if (body.return === true) {
				dispatch(getInvestmentAccountTransactionsAction(data.account));
				dispatch(getAccountInvestmentsAction(data.account));
				dispatch(getAccountListAction());
			}
		})
		.catch(ex => console.log(ex))
	}
};

export const editInvestmentTransactionAction = (data) => (dispatch) => {
	if (data) {
		const apiUrl = '/api/editInvestmentTransaction';

		return fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		})
		.then(res => res.json())
		.then(body => {
			if (body.return === true) {
				dispatch(getInvestmentAccountTransactionsAction(data.account));
				dispatch(getAccountInvestmentsAction(data.account));
				dispatch(getAccountListAction());
			}
		})
		.catch(ex => console.log(ex))
	}
};

export const setfilteredInvestments = params => (dispatch, getState) => {
	const allInvestmentsList = getState().allInvestmentsList;
	dispatch({
		type: SET_FILTERED_INVESTMENTS,
		payload: params
	});

	dispatch({
		type: SET_ALL_INVESTMENTS_FILTERED,
		payload: allInvestmentsList.length === params.length
	});
};

const fetchGetInvestmentPriceSuccess = params => ({
	type: SET_INVESTMENT_PRICE,
	payload: params
});

const fetchGetInvestmentPriceFailure = params => ({
	type: SET_INVESTMENT_PRICE,
	payload: []
});

export const getInvestmentPriceAction = (investment) => (dispatch) => {
	if (investment) {
		const apiUrl = `/api/getInvestmentPrice?investment=${investment}`;

		return fetch(apiUrl)
		.then(res => res.json())
		.then(body => dispatch(fetchGetInvestmentPriceSuccess(body)))
		.catch(ex => dispatch(fetchGetInvestmentPriceFailure(ex)));
	}
};

const fetchGetInvestmentTransactionsSuccess = params => ({
	type: SET_INVESTMENT_TRANSACTIONS,
	payload: params
});

const fetchGetInvestmentTransactionsFailure = params => ({
	type: SET_INVESTMENT_TRANSACTIONS,
	payload: {}
});


export const getInvestmentTransactionsAction = (investment) => (dispatch) => {
	if (investment) {
		const apiUrl = `/api/getInvestmentTransactions?investment=${investment}`;

		return fetch(apiUrl)
		.then(res => res.json())
		.then(body => dispatch(fetchGetInvestmentTransactionsSuccess(body)))
		.catch(ex => dispatch(fetchGetInvestmentTransactionsFailure(ex)));
	}
};
