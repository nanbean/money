import {
	SET_XLS_TRANSACTIONS,
	EDIT_XLS_TRANSACTION,
	DELETE_XLS_TRANSACTION
} from './actionTypes';

export const editXlsTransaction = params => ({
	type: EDIT_XLS_TRANSACTION,
	payload: params
});

export const deleteXlsTransaction = params => ({
	type: DELETE_XLS_TRANSACTION,
	payload: params
});

export const setXlsTransactions = params => ({
	type: SET_XLS_TRANSACTIONS,
	payload: params
});

const fetchUploadTransactionsXlsSuccess = params => ({
	type: SET_XLS_TRANSACTIONS,
	payload: params
});

const fetchUploadTransactionsXlsFailure = params => ({
	type: SET_XLS_TRANSACTIONS,
	payload: []
});

export const uploadTransactionsXlsAction = (files) => (dispatch) => {
	const apiUrl = '/api/uploadTransactionsXls';
	const xlsFile = new FormData();
	xlsFile.append('document', files.files[0]);

	return fetch(apiUrl, {
		method: 'POST',
		body: xlsFile
	})
	.then(res => res.json())
	.then(body => dispatch(fetchUploadTransactionsXlsSuccess(body)))
	.catch(ex => dispatch(fetchUploadTransactionsXlsFailure(ex)))
};
