import {
	SET_ACCOUNT_TRANSACTIONS
} from './actionTypes';

export const setAccountTransactionAction = (accountId) => {
	return async (dispatch, getState) => {
		const state = getState();
		const { allAccountsTransactions } = state;

		dispatch({
			type: SET_ACCOUNT_TRANSACTIONS,
			payload: allAccountsTransactions.filter(i => i.accountId === accountId)
		});
	};
};