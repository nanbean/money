import { getAccountListAction } from './accountActions';

import {
	SET_ALL_ACCOUNT_TRANSACTIONS,
	SET_BANK_TRANSACTIONS,
	SET_LAST_TRANSACTIONS,
	SET_WEEKLY_TRANSACTIONS,
	SET_EDIT_TRANSACTION_FETCHING,
	SET_EDIT_TRANSACTION_RESULT,
	SET_DELETE_TRANSACTION_FETCHING,
	SET_DELETE_TRANSACTION_RESULT
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

export const fetchGetWeeklyTransactionSuccess = params => ({
	type: SET_WEEKLY_TRANSACTIONS,
	payload: params
});

export const fetchGetWeeklyTransactionFailure = () => ({
	type: SET_WEEKLY_TRANSACTIONS,
	payload: []
});

export const getWeeklyTransactionsAction = (start, end) => (dispatch) => {
	const apiUrl = `/api/transactions${start ? '?start=' + start : ''}${end ? '&end=' + end : ''}`;

	return fetch(apiUrl)
		.then(res => res.json())
		.then(body => {
			dispatch(fetchGetWeeklyTransactionSuccess(body));
		})
		.catch(ex => {
			dispatch(fetchGetWeeklyTransactionFailure(ex));
		});
};

export const fetchGetlastTransactionSuccess = params => ({
	type: SET_LAST_TRANSACTIONS,
	payload: params
});

export const fetchGetlastTransactionFailure = () => ({
	type: SET_LAST_TRANSACTIONS,
	payload: []
});

export const getlastTransactionsAction = (start, end) => (dispatch) => {
	const apiUrl = `/api/transactions${start ? '?start=' + start : ''}${end ? '&end=' + end : ''}`;

	return fetch(apiUrl)
		.then(res => res.json())
		.then(body => {
			dispatch(fetchGetlastTransactionSuccess(body));
		})
		.catch(ex => {
			dispatch(fetchGetlastTransactionFailure(ex));
		});
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

export const setDeleteTransactionFetchingAction = value => ({
	type: SET_DELETE_TRANSACTION_FETCHING,
	payload: value
});

export const fetchDeleteTransactionSuccess = body => ({
	type: SET_DELETE_TRANSACTION_RESULT,
	body
});

export const fetchDeleteTransactionFailure = ex => ({
	type: SET_DELETE_TRANSACTION_RESULT,
	ex
});

export const deleteTransactionAction = (data, type) => (dispatch) => {
	if (data) {
		const apiUrl = '/api/deleteTransaction';

		dispatch(setDeleteTransactionFetchingAction(true));
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
				dispatch(fetchDeleteTransactionSuccess(body));
			})
			.catch(ex => dispatch(fetchDeleteTransactionFailure(ex)));
	}
};

export const setEditTransactionFetchingAction = value => ({
	type: SET_EDIT_TRANSACTION_FETCHING,
	payload: value
});

export const fetchEditTransactionSuccess = body => ({
	type: SET_EDIT_TRANSACTION_RESULT,
	body
});

export const fetchEditTransactionFailure = ex => ({
	type: SET_EDIT_TRANSACTION_RESULT,
	ex
});

export const editTransactionAction = (data, type) => (dispatch) => {
	if (data) {
		const apiUrl = '/api/editTransaction';

		dispatch(setEditTransactionFetchingAction(true));
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
				dispatch(fetchEditTransactionSuccess(body));
			})
			.catch(ex => dispatch(fetchEditTransactionFailure(ex)));
	}
};
