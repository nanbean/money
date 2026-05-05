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
	initCouchdbAccountAction,
	finalizeCouchdbAccountAction
} from './couchdbAccountActions';

import { COUCHDB_URL } from '../constants';
import { applyMemoTags } from '../utils/memoTags';

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
	RESET_ALL_ACCOUNTS_TRANSACTIONS,
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
let currentUsername = null;

const updateAllInvestments = async (dispatch) => {
	dispatch(getAllInvestmentsList());
};

const updateAllInvestmentsDebounce = debounce(updateAllInvestments, 1000);

const normalizeTransaction = (doc) => ({
	...doc,
	type: doc.accountId ? doc.accountId.split(':')[1] : undefined,
	account: doc.accountId ? doc.accountId.split(':')[2] : undefined
});

const isInternalTransferCategory = (cat) => !!cat && /^\[.*\]$/.test(cat);

// Locate the doubleEntry pair for an internal transfer transaction.
// Strict match: same date, opposite-sign amount, counterpart accountId, and
// reciprocal category. Returns null if zero or multiple candidates.
const findTransferPair = (t, allAccountsTransactions, accountList) => {
	if (!isInternalTransferCategory(t.category)) return null;

	// Preferred: explicit link by transferId. Unambiguous even when same-day
	// same-amount transfers collide. New docs always carry it; older docs
	// fall through to the legacy heuristic below.
	if (t.transferId) {
		const linked = (allAccountsTransactions || []).find(p =>
			p._id !== t._id && p.transferId === t.transferId
		);
		if (linked) return linked;
	}

	const counterName = t.category.replace(/^\[|\]$/g, '');
	const selfName = t.account || (t.accountId ? t.accountId.split(':')[2] : null);
	if (!counterName || !selfName) return null;
	const counterMeta = accountList.find(a => a.name === counterName);
	if (!counterMeta) return null;
	const counterAccountId = `account:${counterMeta.type}:${counterName}`;
	const expectedCategory = `[${selfName}]`;
	const tAmt = Number(t.amount) || 0;
	const tSign = Math.sign(tAmt);
	const tAbs = Math.abs(tAmt);
	const candidates = (allAccountsTransactions || []).filter(p => {
		const pAmt = Number(p.amount) || 0;
		return p._id !== t._id
			&& p.accountId === counterAccountId
			&& p.category === expectedCategory
			&& p.date === t.date
			&& Math.sign(pAmt) === -tSign
			&& Math.abs(pAmt) === tAbs;
	});
	return candidates.length === 1 ? candidates[0] : null;
};

// Drop NaN-valued numeric fields so they don't poison PouchDB docs.
const stripNaN = (obj) => {
	Object.keys(obj).forEach(k => {
		if (Number.isNaN(obj[k])) delete obj[k];
	});
	return obj;
};

// Build a doubleEntry counterpart doc for an internal-transfer source.
// Returns null when the counter account name in `[brackets]` doesn't resolve
// to a real account — caller should fall back to single-entry write.
const buildPairTransaction = (source, accountList) => {
	if (!isInternalTransferCategory(source.category)) return null;
	const counterName = source.category.replace(/^\[|\]$/g, '');
	const selfName = source.account || (source.accountId ? source.accountId.split(':')[2] : null);
	if (!counterName || !selfName) return null;
	const counterMeta = accountList.find(a => a.name === counterName);
	if (!counterMeta) return null;
	const pair = {
		...source,
		_id: `${source.date}:${counterName}:${uuidv1()}`,
		accountId: `account:${counterMeta.type}:${counterName}`,
		category: `[${selfName}]`,
		amount: -Number(source.amount)
	};
	delete pair._rev;
	delete pair.account;
	delete pair.type;
	return pair;
};

// Same-currency check between two accounts. Cross-currency transfers carry
// distinct amounts on each side (with embedded FX), so we never auto-sync them.
const isSameCurrencyPair = (selfAccountId, counterAccountId, accountList) => {
	const selfAcc = accountList.find(a => a._id === selfAccountId);
	const counterAcc = accountList.find(a => a._id === counterAccountId);
	if (!selfAcc || !counterAcc) return false;
	return (selfAcc.currency || 'KRW') === (counterAcc.currency || 'KRW');
};

// Stamp a transaction with denormalized currency + (when relevant) the
// at-write FX rate, so the doc is self-describing and historical FX is
// preserved. Mutates and returns the doc.
const stampMeta = (txn, accountList, fxRate, displayCurrency) => {
	const acc = accountList.find(a => a._id === txn.accountId);
	if (!acc) return txn;
	const txCur = acc.currency || 'KRW';
	txn.currency = txCur;
	if (txCur !== displayCurrency && Number.isFinite(fxRate) && fxRate > 0) {
		txn.fxRate = fxRate;
	} else {
		delete txn.fxRate; // same-currency: fxRate has no meaning
	}
	return txn;
};

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

		// If this is a _Cash account, cascade update to the parent Invst account
		if (account.name.match(/_Cash$/i)) {
			const invstName = account.name.replace(/_Cash$/i, '');
			await updateAccount(`account:Invst:${invstName}`);
		}
	} catch (err) {
		console.log(err); // eslint-disable-line no-console
	}
};

const startLiveTransactionsSync = (dispatch, remoteTransactionsDB) => {
	transactionsSync = transactionsDB.sync(remoteTransactionsDB, { live: true, retry: true })
		.on('change', function ({ change }) {
			for (let i = 0; i < change.docs.length; i++) {
				const doc = change.docs[i];
				if (doc._deleted) {
					dispatch({
						type: DELETE_ALL_ACCOUNTS_TRANSACTIONS,
						payload: doc._id
					});
				} else if (doc.accountId) {
					dispatch({
						type: ADD_OR_EDIT_ALL_ACCOUNTS_TRANSACTIONS,
						payload: normalizeTransaction(doc)
					});
				}
			}
		}).on('paused', function () {
			dispatch(setTranscationsFetchingAction(false));
		}).on('active', function () {
		}).on('denied', function () {
		}).on('error', function () {
		});
};

export const initCouchdbAction = username => {
	return async dispatch => {
		// destroy local DBs if switching to a different account (prevents cross-account data leak)
		if (currentUsername !== null && currentUsername !== username) {
			await transactionsDB.destroy();
			await historiesDB.destroy();
			transactionsDB = new PouchDB('transactions');
			historiesDB = new PouchDB('histories');
		}
		currentUsername = username;

		// Phase 1: bulk replication (batch_size 500 for fewer HTTP round trips)
		const remoteTransactionsDB = new PouchDB(`https://${COUCHDB_URL}/transactions_${username}`, { skip_setup: true }); // eslint-disable-line camelcase
		transactionsDB.replicate.from(remoteTransactionsDB, {
			batch_size: 500,
			batches_limit: 10
		}).on('complete', async function () {
			try {
				const result = await transactionsDB.allDocs({
					include_docs: true, // eslint-disable-line camelcase
					startkey: moment().subtract(30, 'years').format('YYYY-MM-DD'),
					endkey: `${moment().add(1, 'years').format('YYYY-MM-DD')}\ufff0`
				});
				const docs = result.rows.map(r => normalizeTransaction(r.doc)).sort((a, b) => {
					if (a.date > b.date) return 1;
					if (a.date < b.date) return -1;
					return 0;
				});
				dispatch({ type: RESET_ALL_ACCOUNTS_TRANSACTIONS, payload: docs });

				// Phase 2: live sync for incremental updates only
				startLiveTransactionsSync(dispatch, remoteTransactionsDB);
			} catch (e) {
				// allDocs failed — still clear the loading state
			} finally {
				dispatch(setTranscationsFetchingAction(false));
			}
		}).on('denied', function () {
			dispatch(setTranscationsFetchingAction(false));
		}).on('error', function () {
			dispatch(setTranscationsFetchingAction(false));
		});

		// stocks: bulk replication then live sync
		const remoteStocksDB = new PouchDB(`https://${COUCHDB_URL}/stocks`, { skip_setup: true }); // eslint-disable-line camelcase
		stocksDB.replicate.from(remoteStocksDB, {
			batch_size: 500,
			batches_limit: 2
		}).on('complete', function () {
			updateAllInvestmentsDebounce(dispatch);
			// Phase 2: live sync for stock price updates
			stocksSync = stocksDB.sync(remoteStocksDB, { live: true, retry: true })
				.on('change', function () {
					updateAllInvestmentsDebounce(dispatch);
				}).on('denied', function () {
				}).on('error', function () {
				});
		}).on('denied', function () {
		}).on('error', function () {
		});

		// histories: one-shot replication only (no live sync needed)
		const remoteHistoriesDB = new PouchDB(`https://${COUCHDB_URL}/histories_${username}`, { skip_setup: true }); // eslint-disable-line camelcase
		historiesSync = historiesDB.replicate.from(remoteHistoriesDB, {
			batch_size: 500,
			batches_limit: 2
		}).on('complete', async function () {
			try {
				const result = await historiesDB.allDocs({ include_docs: true }); // eslint-disable-line camelcase
				const docs = result.rows.map(r => r.doc).filter(d => d && !d._id.startsWith('_'));
				dispatch({ type: SET_HISTORY_LIST, payload: docs });
			} catch (e) {
				// allDocs failed — history list remains empty
			}
		}).on('denied', function () {
		}).on('error', function () {
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
		currentUsername = null;
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
	return async (dispatch, getState) => {
		if (!param || !param.date || !param.account) return;
		const transaction = stripNaN({ ...param, _id: `${param.date}:${param.account}:${uuidv1()}` });
		delete transaction.account;
		delete transaction.type;
		applyMemoTags(transaction);

		const state = getState();
		const accountList = state.accountList || [];
		const settings = state.settings || {};
		const displayCurrency = settings.currency || 'KRW';
		const fxRate = Number(settings.exchangeRate);

		// Resolve doubleEntry pair before any dispatch / put so a missing
		// counter account or cross-currency mismatch can't leave the UI and
		// DB half-written.
		let pairTxn = null;
		if (isInternalTransferCategory(transaction.category)) {
			// Issue an explicit transferId so both halves are unambiguously
			// linked (replaces the legacy date+amount heuristic).
			transaction.transferId = uuidv1();
			const candidate = buildPairTransaction(transaction, accountList);
			if (candidate && isSameCurrencyPair(transaction.accountId, candidate.accountId, accountList)) {
				candidate.transferId = transaction.transferId;
				stampMeta(candidate, accountList, fxRate, displayCurrency);
				pairTxn = candidate;
			}
			// Counter account missing or cross-currency: skip auto-pair, the
			// transferId still stamps this side so a manually-added counterpart
			// can be linked later by editing it to the same transferId.
		}

		stampMeta(transaction, accountList, fxRate, displayCurrency);

		dispatch(setAddTransactionFetchingAction(true));
		dispatch({
			type: ADD_ALL_ACCOUNTS_TRANSACTIONS,
			payload: normalizeTransaction(transaction)
		});
		await transactionsDB.put(transaction);

		if (pairTxn) {
			dispatch({
				type: ADD_ALL_ACCOUNTS_TRANSACTIONS,
				payload: normalizeTransaction(pairTxn)
			});
			await transactionsDB.put(pairTxn);
			await updateAccount(pairTxn.accountId);
		}

		await updateAccount(transaction.accountId);
		dispatch(setAddTransactionFetchingAction(false));
	};
};

export const setEditTransactionFetchingAction = value => ({
	type: SET_EDIT_TRANSACTION_FETCHING,
	payload: value
});

export const editTransactionAction = param => {
	return async (dispatch, getState) => {
		if (!param) return;
		const transaction = stripNaN({ ...param, ...param.changed });
		const accountId = `account:${transaction.type}:${transaction.account}`;
		const original = param;
		delete transaction.changed;
		delete transaction.account;
		delete transaction.type;
		// Keep the embedded accountId in lockstep with the (possibly edited)
		// type/account so stampMeta reads the right currency.
		transaction.accountId = accountId;
		applyMemoTags(transaction);

		const state = getState();
		const accountList = state.accountList || [];
		const allAccountsTransactions = state.allAccountsTransactions || [];
		const settings = state.settings || {};
		const displayCurrency = settings.currency || 'KRW';
		const fxRate = Number(settings.exchangeRate);

		const wasTransfer = isInternalTransferCategory(original.category);
		const isStillTransfer = isInternalTransferCategory(transaction.category);
		const oldPair = wasTransfer ? findTransferPair(original, allAccountsTransactions, accountList) : null;
		// Category retarget — e.g. [A] → [B]. Old pair lives on the wrong
		// counter account; we must drop it and create a fresh pair.
		const counterChanged = wasTransfer && isStillTransfer
			&& original.category !== transaction.category;

		// Decide the transferId for the post-edit doc.
		//   - still a transfer & same counter → reuse existing id (or mint one
		//     for legacy docs so this edit propagates the link).
		//   - transitioning into a transfer or counter changed → fresh id.
		//   - no longer a transfer → drop the field.
		if (isStillTransfer) {
			if (wasTransfer && !counterChanged) {
				transaction.transferId = original.transferId || oldPair?.transferId || uuidv1();
			} else {
				transaction.transferId = uuidv1();
			}
		} else {
			delete transaction.transferId;
		}

		stampMeta(transaction, accountList, fxRate, displayCurrency);

		dispatch(setEditTransactionFetchingAction(true));
		dispatch({
			type: EDIT_ALL_ACCOUNTS_TRANSACTIONS,
			payload: transaction
		});
		await transactionsDB.put({ ...transaction });
		await updateAccount(accountId);

		try {
			// Case 1: transfer → non-transfer. Drop the orphaned counterpart.
			if (wasTransfer && !isStillTransfer) {
				if (oldPair) {
					const liveDoc = await transactionsDB.get(oldPair._id).catch(() => null);
					if (liveDoc) {
						await transactionsDB.remove(liveDoc);
						dispatch({ type: DELETE_ALL_ACCOUNTS_TRANSACTIONS, payload: oldPair._id });
						await updateAccount(oldPair.accountId);
					}
				}
				return;
			}

			// Case 2 & 3: pair must be (re)created — either a brand new transfer,
			// or the counter account just changed.
			if (isStillTransfer && (!wasTransfer || counterChanged)) {
				if (counterChanged && oldPair) {
					const liveDoc = await transactionsDB.get(oldPair._id).catch(() => null);
					if (liveDoc) {
						await transactionsDB.remove(liveDoc);
						dispatch({ type: DELETE_ALL_ACCOUNTS_TRANSACTIONS, payload: oldPair._id });
						await updateAccount(oldPair.accountId);
					}
				}
				const candidate = buildPairTransaction(transaction, accountList);
				if (candidate && isSameCurrencyPair(transaction.accountId, candidate.accountId, accountList)) {
					candidate.transferId = transaction.transferId;
					stampMeta(candidate, accountList, fxRate, displayCurrency);
					dispatch({
						type: ADD_ALL_ACCOUNTS_TRANSACTIONS,
						payload: normalizeTransaction(candidate)
					});
					await transactionsDB.put(candidate);
					await updateAccount(candidate.accountId);
				}
				// Cross-currency or unresolved counter account: skip auto-pair,
				// user manages the other side manually.
				return;
			}

			// Case 4: same transfer (same counter account) — sync amount /
			// date / payee / memo / subcategory across the pair.
			if (wasTransfer && isStillTransfer && oldPair) {
				if (!isSameCurrencyPair(transaction.accountId, oldPair.accountId, accountList)) {
					return; // cross-currency: leave pair as-is so FX isn't overwritten
				}

				const liveDoc = await transactionsDB.get(oldPair._id);
				const newAmount = -Number(transaction.amount);
				const dateChanged = transaction.date !== oldPair.date;
				// Only sync subcategory when the edit explicitly carried one;
				// undefined would silently strip the field on JSON serialize.
				const syncedSubcategory = transaction.subcategory !== undefined
					? transaction.subcategory
					: liveDoc.subcategory;

				if (dateChanged) {
					// _id encodes the date, so a date change means remove + new put
					await transactionsDB.remove(liveDoc);
					dispatch({ type: DELETE_ALL_ACCOUNTS_TRANSACTIONS, payload: oldPair._id });
					const counterName = oldPair.accountId.split(':')[2];
					const newDoc = {
						...liveDoc,
						_id: `${transaction.date}:${counterName}:${uuidv1()}`,
						date: transaction.date,
						amount: newAmount,
						payee: transaction.payee,
						memo: transaction.memo,
						subcategory: syncedSubcategory,
						transferId: transaction.transferId
					};
					delete newDoc._rev;
					stampMeta(newDoc, accountList, fxRate, displayCurrency);
					const result = await transactionsDB.put(newDoc);
					dispatch({
						type: ADD_OR_EDIT_ALL_ACCOUNTS_TRANSACTIONS,
						payload: normalizeTransaction({ ...newDoc, _rev: result.rev })
					});
				} else {
					const updated = {
						...liveDoc,
						amount: newAmount,
						payee: transaction.payee,
						memo: transaction.memo,
						subcategory: syncedSubcategory,
						transferId: transaction.transferId
					};
					stampMeta(updated, accountList, fxRate, displayCurrency);
					const result = await transactionsDB.put(updated);
					dispatch({
						type: EDIT_ALL_ACCOUNTS_TRANSACTIONS,
						payload: normalizeTransaction({ ...updated, _rev: result.rev })
					});
				}
				await updateAccount(oldPair.accountId);
			}
		} catch (err) {
			console.log('editTransactionAction pair sync error:', err); // eslint-disable-line no-console
		}
	};
};

export const setDeleteTransactionFetchingAction = value => ({
	type: SET_DELETE_TRANSACTION_FETCHING,
	payload: value
});

export const deleteTransactionAction = params => {
	return async (dispatch, getState) => {
		if (!params) return;
		dispatch(setDeleteTransactionFetchingAction(true));

		const state = getState();
		const accountList = state.accountList || [];
		const allAccountsTransactions = state.allAccountsTransactions || [];

		// Locate the doubleEntry pair before we delete the original record,
		// so we can remove both halves of the transfer atomically (otherwise
		// the counterpart becomes an orphan booking).
		const pair = isInternalTransferCategory(params.category)
			? findTransferPair(params, allAccountsTransactions, accountList)
			: null;

		dispatch({
			type: DELETE_ALL_ACCOUNTS_TRANSACTIONS,
			payload: params._id
		});
		await transactionsDB.remove(params._id, params._rev);
		await updateAccount(params.accountId);

		if (pair) {
			try {
				const liveDoc = await transactionsDB.get(pair._id);
				await transactionsDB.remove(liveDoc);
				dispatch({ type: DELETE_ALL_ACCOUNTS_TRANSACTIONS, payload: pair._id });
				await updateAccount(pair.accountId);
			} catch (err) {
				console.log('deleteTransactionAction pair removal error:', err); // eslint-disable-line no-console
			}
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
			payload: allTransactions.map(normalizeTransaction)
		});
	};
};

const getAllAccountsTransactions = () => {
	return async dispatch => {
		const allTransactions = await getAllTransactions();

		dispatch({
			type: SET_ALL_ACCOUNTS_TRANSACTIONS,
			payload: allTransactions.map(normalizeTransaction)
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
