import { getAccountListAction } from './accountActions';

import {
	SET_ALL_ACCOUNT_TRANSACTIONS,
	SET_BANK_TRANSACTIONS
} from './actionTypes';

export const fetchGetAllAccountTransactionsSuccess = params => ({
	type: SET_ALL_ACCOUNT_TRANSACTIONS,
	payload: params
});

export const fetchGetAllAccountTransactionsFailure = () => ({
	type: SET_ALL_ACCOUNT_TRANSACTIONS,
	payload: {}
});

export const getAllAccountTransactionsAction = () => (dispatch) => {
	const apiUrl = '/api/getAllAccountTransactions';

	return fetch(apiUrl)
		.then(res => res.json())
		.then(body => dispatch(fetchGetAllAccountTransactionsSuccess(body)))
		.catch(ex => dispatch(fetchGetAllAccountTransactionsFailure(ex)));
};

export const fetchGetTransactionsSuccess = params => ({
	type: SET_BANK_TRANSACTIONS,
	payload: params
});

export const fetchGetTransactionsFailure = () => ({
	type: SET_BANK_TRANSACTIONS,
	payload: []
});

export const getTransactionsAction = (account) => (dispatch) => {
	if (account) {
		const apiUrl = `/api/getTransactions?account=${account}`;

		return fetch(apiUrl)
			.then(res => res.json())
			.then(body => dispatch(fetchGetTransactionsSuccess(body)))
			.catch(ex => dispatch(fetchGetTransactionsFailure(ex)));
	}
};

export const addTransactionsAction = (data) => (dispatch) => {
	if (data) {
		const apiUrl = '/api/addTransactions';

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
					dispatch(getTransactionsAction(data.account));
					dispatch(getAccountListAction());
				}
			})
			.catch();
	}
};

export const addTransactionAction = (data) => (dispatch) => {
	if (data) {
		const apiUrl = '/api/addTransaction';

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
					dispatch(getTransactionsAction(data.account));
					dispatch(getAccountListAction());
				}
			})
			.catch();
	}
};

export const deleteTransactionAction = (data, type) => (dispatch) => {
	if (data) {
		const apiUrl = '/api/deleteTransaction';

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
					if (type === 'search') {
						dispatch(getAllAccountTransactionsAction());
						dispatch(getAccountListAction());
					} else {
						dispatch(getTransactionsAction(data.account));
						dispatch(getAccountListAction());
					}
				}
			})
			.catch();
	}
};

export const editTransactionAction = (data, type) => (dispatch) => {
	if (data) {
		const apiUrl = '/api/editTransaction';

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
					if (type === 'search') {
						dispatch(getAllAccountTransactionsAction());
						dispatch(getAccountListAction());
					} else {
						dispatch(getTransactionsAction(data.account));
						dispatch(getAccountListAction());
					}
				}
			})
			.catch();
	}
};
