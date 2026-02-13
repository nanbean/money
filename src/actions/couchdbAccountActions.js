import PouchDB from 'pouchdb';
import debounce from 'lodash.debounce';

import {
	SET_ACCOUNT_LIST,
	SET_ACCOUNT_INVESTMENTS
} from './actionTypes';

import { COUCHDB_URL } from '../constants';

export let accountsDB = new PouchDB('accounts');
let accountsSync;

const updateAllAccounts = async (dispatch) => {
	dispatch(getAccountListAction());
};

const updateAllAccountsDebounce = debounce(updateAllAccounts, 1000);

export const getAllAccounts = async () => {
	const accountsResponse = await accountsDB.allDocs({ include_docs: true }); // eslint-disable-line camelcase
	const allAccounts = accountsResponse.rows.map(i => i.doc);

	return allAccounts;
};

export const getAccountListAction = () => {
	return async dispatch => {
		const accountList = await getAllAccounts();

		dispatch({
			type: SET_ACCOUNT_LIST,
			payload: accountList
		});
	};
};

export const initCouchdbAccountAction = username => {
	return async dispatch => {
		let remoteAccountsDB = new PouchDB(`https://${COUCHDB_URL}/accounts_${username}`, { skip_setup: true }); // eslint-disable-line camelcase
		accountsSync = accountsDB.sync(remoteAccountsDB, { live: true, retry: true })
			.on('change', function () {
				updateAllAccountsDebounce(dispatch);
				// handle change
			});
		
		dispatch(getAccountListAction());
	};
};

export const finalizeCouchdbAccountAction = () => {
	return async () => {
		accountsSync && accountsSync.cancel();
	};
};

export const addAccountAction = (account) => {
	return async dispatch => {
		try {
			if (account.type === 'Invst') {
				const cashAccountName = `${account.name}_Cash`;
				const cashAccountId = `account:Bank:${cashAccountName}`;
				const cashAccount = {
					_id: cashAccountId,
					name: cashAccountName,
					type: 'Bank',
					currency: account.currency
				};
				await accountsDB.put(cashAccount);
				account.cashAccountId = cashAccountId;
			}
			await accountsDB.put(account);
			dispatch(getAccountListAction());
		} catch (e) {
			console.log(e); // eslint-disable-line no-console
		}
	};
};

export const editAccountAction = (account) => {
	return async dispatch => {
		try {
			const doc = await accountsDB.get(account._id);
			if (doc.type === 'Invst' && doc.cashAccountId) {
				try {
					const cashDoc = await accountsDB.get(doc.cashAccountId);
					await accountsDB.put({
						...cashDoc,
						closed: account.closed,
						currency: account.currency
					});
				} catch (e) {
					console.log(e); // eslint-disable-line no-console
				}
			} else if (doc.type === 'Bank') {
				const allAccounts = await getAllAccounts();
				const parentAccount = allAccounts.find(i => i.type === 'Invst' && i.cashAccountId === doc._id);
				if (parentAccount) {
					try {
						await accountsDB.put({
							...parentAccount,
							closed: account.closed,
							currency: account.currency
						});
					} catch (e) {
						console.log(e); // eslint-disable-line no-console
					}
				}
			}
			await accountsDB.put({ ...doc, ...account });
			dispatch(getAccountListAction());
		} catch (e) {
			console.log(e); // eslint-disable-line no-console
		}
	};
};

export const deleteAccountAction = (account) => {
	return async dispatch => {
		try {
			const doc = await accountsDB.get(account._id);

			if (doc.type === 'Invst' && doc.cashAccountId) {
				try {
					const cashDoc = await accountsDB.get(doc.cashAccountId);
					await accountsDB.remove(cashDoc);
				} catch (e) {
					console.log(e); // eslint-disable-line no-console
				}
			} else if (doc.type === 'Bank') {
				const allAccounts = await getAllAccounts();
				const parentAccount = allAccounts.find(i => i.type === 'Invst' && i.cashAccountId === doc._id);
				if (parentAccount) {
					try {
						const parentDoc = await accountsDB.get(parentAccount._id);
						await accountsDB.remove(parentDoc);
					} catch (e) {
						console.log(e); // eslint-disable-line no-console
					}
				}
			}
			await accountsDB.remove(doc);
			dispatch(getAccountListAction());
		} catch (e) {
			console.log(e); // eslint-disable-line no-console
		}
	};
};

export const getAccountInvestmentsAction = (accountId) => {
	return async dispatch => {
		const account = await accountsDB.get(accountId);

		dispatch({
			type: SET_ACCOUNT_INVESTMENTS,
			payload: account.investments
		});
	};
};