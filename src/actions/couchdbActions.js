// import debounce from 'lodash.debounce';
import PouchDB from 'pouchdb';
import pouchdbAuthentication from 'pouchdb-authentication';
import pouchdbFind from 'pouchdb-find';
import _ from 'lodash';
import debounce from 'lodash.debounce';
import uuidv1 from 'uuid/v1';
import moment from 'moment';

import {
	initCouchdbReportAction,
	finalizeCouchdbReportAction
} from './couchdbReportActions';

import {
	initCouchdbSettingAction,
	finalizeCouchdbSettingAction
} from './couchdbSettingActions';

import {
	accountsDB,
	getAllAccounts,
	initCouchdbAccountAction,
	finalizeCouchdbAccountAction
} from './couchdbAccountActions';

import { COUCHDB_URL } from '../constants';

import {
	SET_ADD_TRANSACTION_FETCHING,
	SET_DELETE_TRANSACTION_FETCHING,
	SET_EDIT_TRANSACTION_FETCHING,
	SET_ALL_INVESTMENTS,
	SET_ALL_ACCOUNTS_TRANSACTIONS,
	ADD_ALL_ACCOUNTS_TRANSACTIONS,
	DELETE_ALL_ACCOUNTS_TRANSACTIONS,
	EDIT_ALL_ACCOUNTS_TRANSACTIONS,
	ADD_OR_EDIT_ALL_ACCOUNTS_TRANSACTIONS,
	SET_HISTORY_LIST,
	SET_PAYEE_LIST,
	SET_WEEKLY_TRANSACTIONS,
	SET_TRANSACTIONS_FETCHING
} from './actionTypes';

PouchDB.plugin(pouchdbAuthentication);
PouchDB.plugin(pouchdbFind);

let transactionsDB = new PouchDB('transactions');
let stocksDB = new PouchDB('stocks');
let historiesDB = new PouchDB('histories');

let transactionsSync;
let stocksSync;
let historiesSync;

const updateAllInvestments = async (dispatch) => {
	dispatch(getAllInvestmentsList());
};

const updateAllInvestmentsDebounce = debounce(updateAllInvestments, 1000);

const getAllTransactions = async () => {
	const transactionsResponse = await transactionsDB.allDocs({
		include_docs: true, // eslint-disable-line camelcase
		startkey: moment().subtract(30, 'years').format('YYYY-MM-DD'),
		endkey: `${moment().add(1, 'years').format('YYYY-MM-DD')}\ufff0`
	});
	const allTransactions = transactionsResponse.rows.map(i => i.doc).sort((a, b) => {
		if (a.date > b.date) {
			return 1;
		}
		if (a.date < b.date) {
			return -1;
		}
		return 0;
	});

	return allTransactions;
};

const getAllInvestments = async () => {
	const kospi = await stocksDB.get('kospi'); // eslint-disable-line camelcase
	const kosdaq = await stocksDB.get('kosdaq'); // eslint-disable-line camelcase
	const us = await stocksDB.get('us'); // eslint-disable-line camelcase
	const allInvestments = [
		...kospi.data,
		...kosdaq.data,
		...us.data
	];

	return allInvestments;
};

const getAllHistories = async () => {
	const historiesResponse = await historiesDB.allDocs({ include_docs: true }); // eslint-disable-line camelcase
	const allHistories = historiesResponse.rows.map(i => i.doc);

	return allHistories;
};

const getInvestmentList = (allInvestments, allTransactions, transactions) => {
	const investments = [];
	for (let i = 0; i < transactions.length; i++) {
		const transaction = transactions[i];
		if (transaction) {
			const activity = transaction.activity;
			const investmentIdx = investments.findIndex((item) => item.name === transaction.investment);
			if (activity === 'Buy') {
				if (investmentIdx >= 0) {
					investments[investmentIdx].price = (investments[investmentIdx].price * investments[investmentIdx].quantity + transaction.price * transaction.quantity) / (investments[investmentIdx].quantity + transaction.quantity);
					investments[investmentIdx].quantity += transaction.quantity;
					investments[investmentIdx].gain -= transaction.commission ? transaction.commission : 0;
					investments[investmentIdx].amount += (transaction.amount);
				} else {
					investments.push({
						name: transaction.investment,
						quantity: transaction.quantity,
						price: transaction.price,
						amount: transaction.amount,
						gain: transaction.commission ? -transaction.commission : 0
					});
				}
			} else if (transaction.activity === 'Sell') {
				if (investmentIdx >= 0) {
					investments[investmentIdx].gain -= transaction.commission ? transaction.commission : 0;
					investments[investmentIdx].gain -= parseInt(investments[investmentIdx].price * investments[investmentIdx].quantity - transaction.price * transaction.quantity, 10);
					investments[investmentIdx].quantity -= transaction.quantity;
					investments[investmentIdx].amount -= transaction.amount;

					if (investments[investmentIdx].quantity === 0) {
						investments[investmentIdx].amount = 0;
					}
				}
			} else if (activity === 'ShrsIn') {
				try {
					const shrsOutTransactionFind = allTransactions.find(i => i.activity === 'ShrsOut' && i.investment === transaction.investment && i.date === transaction.date);
					const shrsOutTransactionPrice = shrsOutTransactionFind && shrsOutTransactionFind.price;

					if (investmentIdx >= 0) {
						investments[investmentIdx].price = (investments[investmentIdx].price * investments[investmentIdx].quantity + shrsOutTransactionPrice * transaction.quantity) / (investments[investmentIdx].quantity + transaction.quantity);
						investments[investmentIdx].quantity += transaction.quantity;
					} else {
						investments.push({
							name: transaction.investment,
							quantity: transaction.quantity,
							price: shrsOutTransactionPrice,
							amount: transaction.amount,
							gain: transaction.commission ? -transaction.commission : 0
						});
					}
				} catch (err) {
					console.log(err); // eslint-disable-line no-console
				}
			} else if (activity === 'ShrsOut') {
				if (investmentIdx >= 0) {
					investments[investmentIdx].quantity -= transaction.quantity;
					if (investments[investmentIdx].quantity === 0) {
						investments[investmentIdx].amount = 0;
					} else {
						investments[investmentIdx].amount -= (transaction.price * transaction.quantity);
					}
				}

			}
		}
	}

	return investments.map(i => {
		const investment = allInvestments.find(j => j.name === i.name);

		if (investment) {
			// update current price
			return {
				...i,
				purchasedPrice: i.price,
				purchasedValue: i.price * i.quantity,
				appraisedValue: investment.price * i.quantity,
				price: investment.price
			};
		} else {
			return {
				...i,
				purchasedPrice: i.price,
				purchasedValue: i.price * i.quantity,
				appraisedValue: i.price * i.quantity
			};
		}
	});
};

const getInvestmentBalance = (investments) => {
	let balance = 0;
	if (investments.length > 0) {
		balance = investments.map((i) => i.price * i.quantity).reduce((prev, curr) => prev + curr);
	}

	return balance;
};

const getBalance = (name, allTransactions, transactions) => {
	let balance = 0;
	for (let i = 0; i < transactions.length; i++) {
		const transaction = transactions[i];
		if (transaction) {
			balance += transaction.amount;
		}
	}

	// We have to subtract ivestment in investment cash account
	if (name.match(/_Cash/i)) {
		const accountId = `account:Invst:${name.split('_')[0]}`;
		const investmemtTransaction = allTransactions.filter(i => i.accountId === accountId);
		for (let i = 0; i < investmemtTransaction.length; i++) {
			const transaction = investmemtTransaction[i];
			if (transaction.activity === 'Buy' || transaction.activity === 'MiscExp') {
				balance -= transaction.amount;
			} else if (transaction.activity === 'Sell' || transaction.activity === 'Div') {
				balance += transaction.amount;
			}
		}
	}

	return balance;
};

const updateAccount = async (accountId) => {
	try {
		const allTransactions = await getAllTransactions();
		const allInvestments = await getAllInvestments();
		const account = await accountsDB.get(accountId);
		const type = accountId.split(':')[1];
		let balance = 0;
		let investments = [];

		if (type === 'Invst') {
			investments = getInvestmentList(allInvestments, allTransactions, allTransactions.filter(i => i.accountId === accountId));
			balance = getInvestmentBalance(investments);
			const cashBalance = getBalance(account.cashAccountId.split(':')[2], allTransactions, allTransactions.filter(i => i.accountId === account.cashAccountId));
			account.cashBalance = cashBalance;
			balance += cashBalance;
		} else {
			balance = getBalance(account.name, allTransactions, allTransactions.filter(i => i.accountId === accountId));
		}
		await accountsDB.put({ ...account, investments, balance });
	} catch (err) {
		console.log(err); // eslint-disable-line no-console
	}
};

export const initCouchdbAction = username => {
	return async dispatch => {
		let remoteTransactionsDB = new PouchDB(`https://${COUCHDB_URL}/transactions_${username}`, { skip_setup: true }); // eslint-disable-line camelcase
		transactionsSync = transactionsDB.sync(remoteTransactionsDB, { live: true, retry: true })
			.on('change', function ({ change, deleted }) {
				// updateAllTransactionsDebounce(dispatch);
				// handle change
				if (deleted) {
					// console.log(change);
					for (let i = 0; i < change.docs.length; i++) {
						dispatch({
							type: DELETE_ALL_ACCOUNTS_TRANSACTIONS,
							payload: change.docs[i]._id
						});
					}
				} else {
					// console.log(change);
					for (let i = 0; i < change.docs.length; i++) {
						dispatch({
							type: ADD_OR_EDIT_ALL_ACCOUNTS_TRANSACTIONS,
							payload: {
								...change.docs[i],
								type: change.docs[i].accountId.split(':')[1],
								account: change.docs[i].accountId.split(':')[2]
							}
						});
					}
				}
			}).on('paused', function () {
				// updateAllTransactionsDebounce();
				// replication paused (e.g. replication up to date, user went offline)
				dispatch(setTranscationsFetchingAction(false));
			}).on('active', function () {
				// replicate resumed (e.g. new changes replicating, user went back online)
			}).on('denied', function () {
				// a document failed to replicate (e.g. due to permissions)
			}).on('complete', function () {
				// handle complete
				// console.log('complete');
			}).on('error', function () {
				// handle error
			});
		let remoteStocksDB = new PouchDB(`https://${COUCHDB_URL}/stocks`, { skip_setup: true }); // eslint-disable-line camelcase
		stocksSync = stocksDB.sync(remoteStocksDB, { live: true, retry: true })
			.on('change', function () {
				updateAllInvestmentsDebounce(dispatch);
				// handle change
			}).on('paused', function () {
				// updateAllInvestmentsDebounce();
				// replication paused (e.g. replication up to date, user went offline)
			}).on('active', function () {
				// replicate resumed (e.g. new changes replicating, user went back online)
			}).on('denied', function () {
				// a document failed to replicate (e.g. due to permissions)
			}).on('complete', function () {
				// handle complete
			}).on('error', function () {
				// handle error
			});
		let remoteHistoriesDB = new PouchDB(`https://${COUCHDB_URL}/histories_${username}`, { skip_setup: true }); // eslint-disable-line camelcase
		historiesSync = historiesDB.sync(remoteHistoriesDB, {})
			.on('change', function () {
				// handle change
			}).on('paused', function () {
				// replication paused (e.g. replication up to date, user went offline)
			}).on('active', function () {
				// replicate resumed (e.g. new changes replicating, user went back online)
			}).on('denied', function () {
				// a document failed to replicate (e.g. due to permissions)
			}).on('complete', function () {
				// handle complete
			}).on('error', function () {
				// handle error
			});

		dispatch(initCouchdbReportAction(username));
		dispatch(initCouchdbSettingAction(username));
		dispatch(initCouchdbAccountAction(username));
	};
};

export const finalizeCouchdbAction = () => {
	return async () => {
		transactionsSync && transactionsSync.cancel();
		stocksSync && stocksSync.cancel();
		historiesSync && historiesSync.cancel();
		finalizeCouchdbReportAction();
		finalizeCouchdbSettingAction();
		finalizeCouchdbAccountAction();
	};
};

export const setAddTransactionFetchingAction = value => ({
	type: SET_ADD_TRANSACTION_FETCHING,
	payload: value
});

export const addTransactionAction = param => {
	return async dispatch => {
		if (param && param.date && param.account) {
			const transaction = { ...param, _id: `${param.date}:${param.account}:${uuidv1()}` };
			Object.keys(transaction).forEach(key => {
				if (Number.isNaN(transaction[key])) {
					delete transaction[key];
				}
			});
			delete transaction.account;
			delete transaction.type;

			dispatch(setAddTransactionFetchingAction(true));
			dispatch({
				type: ADD_ALL_ACCOUNTS_TRANSACTIONS,
				payload: {
					...transaction,
					type: transaction.accountId.split(':')[1],
					account: transaction.accountId.split(':')[2]
				}
			});
			await transactionsDB.put(transaction);

			if (transaction.category && transaction.category.startsWith('[') && transaction.category.endsWith(']')) {
				const accountList = await getAllAccounts();
				const doubleEntryAccount = transaction.category.replace(/^\[|\]$/g, '');
				const doubleEntryType = accountList.find(i => i.name === doubleEntryAccount).type;
				const doubleEntryAccountId = `account:${doubleEntryType}:${doubleEntryAccount}`;
				const doubleEntryTransaction = {
					...transaction,
					_id: `${transaction.date}:${doubleEntryAccount}:${uuidv1()}`,
					accountId: doubleEntryAccountId,
					category: `[${transaction.accountId.split(':')[2]}]`,
					amount: -transaction.amount
				};

				dispatch({
					type: ADD_ALL_ACCOUNTS_TRANSACTIONS,
					payload: {
						...doubleEntryTransaction,
						type: doubleEntryTransaction.accountId.split(':')[1],
						account: doubleEntryTransaction.accountId.split(':')[2]
					}
				});
				await transactionsDB.put(doubleEntryTransaction);
				await updateAccount(doubleEntryTransaction.accountId);
			}

			await updateAccount(transaction.accountId);
			dispatch(setAddTransactionFetchingAction(false));
			// dispatch(getAllAccountsTransactionsAction());
		}
	};
};

export const setEditTransactionFetchingAction = value => ({
	type: SET_EDIT_TRANSACTION_FETCHING,
	payload: value
});

export const editTransactionAction = param => {
	return async dispatch => {
		if (param) {
			const transaction = { ...param, ...param.changed };
			const accountId = `account:${transaction.type}:${transaction.account}`;
			delete transaction.changed;
			delete transaction.account;
			delete transaction.type;

			dispatch(setEditTransactionFetchingAction(true));
			dispatch({
				type: EDIT_ALL_ACCOUNTS_TRANSACTIONS,
				payload: transaction
			});
			await transactionsDB.put({
				...transaction
			});

			await updateAccount(accountId);
			// dispatch(getAccountList());
			// dispatch(setEditTransactionFetchingAction(false));
			// dispatch(getAllAccountsTransactionsAction());
		}
	};
};

export const setDeleteTransactionFetchingAction = value => ({
	type: SET_DELETE_TRANSACTION_FETCHING,
	payload: value
});

export const deleteTransactionAction = params => {
	return async dispatch => {
		if (params) {
			dispatch(setDeleteTransactionFetchingAction(true));
			dispatch({
				type: DELETE_ALL_ACCOUNTS_TRANSACTIONS,
				payload: params._id
			});
			await transactionsDB.remove(params._id, params._rev);

			await updateAccount(params.accountId);
			// dispatch(getAccountList());
			// dispatch(setDeleteTransactionFetchingAction(false));
			// dispatch(getAllAccountsTransactionsAction());
		}
	};
};

const getWeeklyTransactions = async () => {
	const transactionsResponse = await transactionsDB.allDocs({
		include_docs: true, // eslint-disable-line camelcase
		startkey: moment().subtract(1, 'weeks').format('YYYY-MM-DD'),
		endkey: `${moment().format('YYYY-MM-DD')}\ufff0`
	});
	const allTransactions = transactionsResponse.rows.map(i => i.doc);

	return allTransactions;
};

export const getWeeklyTransactionsAction = () => {
	return async dispatch => {
		const allTransactions = await getWeeklyTransactions();

		dispatch({
			type: SET_WEEKLY_TRANSACTIONS,
			payload: allTransactions.map(i => ({ ...i, type: i.accountId.split(':')[1], account: i.accountId.split(':')[2] }))
		});
	};
};

const getAllAccountsTransactions = () => {
	return async dispatch => {
		const allTransactions = await getAllTransactions();

		dispatch({
			type: SET_ALL_ACCOUNTS_TRANSACTIONS,
			payload: allTransactions.map(i => ({ ...i, type: i.accountId.split(':')[1], account: i.accountId.split(':')[2] }))
		});
	};
};

export const getAllAccountsTransactionsAction = () => {
	return async dispatch => {
		dispatch(getAllAccountsTransactions());
	};
};

const getAllInvestmentsList = () => {
	return async dispatch => {
		const allInvestments = await getAllInvestments();

		dispatch({
			type: SET_ALL_INVESTMENTS,
			payload: allInvestments
		});
	};
};

export const getAllInvestmentsListAction = () => {
	return async dispatch => {
		dispatch(getAllInvestmentsList());
	};
};

const getHistoryList = () => {
	return async dispatch => {
		const historyList = await getAllHistories();

		dispatch({
			type: SET_HISTORY_LIST,
			payload: historyList
		});
	};
};

export const getHistoryListAction = () => {
	return async dispatch => {
		dispatch(getHistoryList());
	};
};

export const getPayeeListAction = () => {
	return async dispatch => {
		const allTransactions = await getAllTransactions();
		const payees = allTransactions.map(i => i.payee).filter(i => i);

		dispatch({
			type: SET_PAYEE_LIST,
			payload: _.uniq(payees.sort())
		});
	};
};

export const setTranscationsFetchingAction = value => ({
	type: SET_TRANSACTIONS_FETCHING,
	payload: value
});
