import PouchDB from 'pouchdb';

import {
	SET_SETTINGS
} from './actionTypes';

import { COUCHDB_URL } from '../constants';

let settingsDB = new PouchDB('settings');
let settingsSync;

export const initCouchdbSettingAction = username => {
	return async dispatch => {
		let remoteSettingsDB = new PouchDB(`https://${COUCHDB_URL}/settings_${username}`, { skip_setup: true }); // eslint-disable-line camelcase
		settingsSync = settingsDB.sync(remoteSettingsDB, { live: true, retry: true })
			.on('change', function () {
				dispatch(getSettingsAction());
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
	};
};

export const finalizeCouchdbSettingAction = () => {
	return async () => {
		settingsSync && settingsSync.cancel();
	};
};

export const getSettingsAction = () => {
	return async dispatch => {
		const settingsResponse = await settingsDB.allDocs({ include_docs: true }); // eslint-disable-line camelcase
		const settings = settingsResponse.rows.map(i => i.doc);

		dispatch({
			type: SET_SETTINGS,
			payload: settings
		});
	};
};

export const updateGeneralAction = (key, value) => {
	return async dispatch => {
		let settingDoc;
		try {
			settingDoc = await settingsDB.get(key);
			settingDoc.value = value;
		} catch (e) {
			if (e.name === 'not_found') {
				settingDoc = {
					_id: key,
					value
				};
			} else {
				throw e;
			}
		}
		await settingsDB.put(settingDoc);
		dispatch(getSettingsAction());
	};
};

export const addCategoryAction = (value) => {
	return async dispatch => {
		const categoryList = await settingsDB.get('categoryList');
		categoryList.value.push(value);
		categoryList.value.sort();
		await settingsDB.put(categoryList);
		dispatch(getSettingsAction());
	};
};

export const deleteCategoryAction = (index) => {
	return async dispatch => {
		const categoryList = await settingsDB.get('categoryList');
		categoryList.value.splice(index, 1);
		await settingsDB.put(categoryList);
		dispatch(getSettingsAction());
	};
};

export const updateCategoryAction = (index, value) => {
	return async dispatch => {
		const categoryList = await settingsDB.get('categoryList');
		categoryList.value[index] = value;
		await settingsDB.put(categoryList);
		dispatch(getSettingsAction());
	};
};

export const addPaymentAction = (payment) => {
	return async dispatch => {
		let paymentListDoc;
		try {
			paymentListDoc = await settingsDB.get('paymentList');
		} catch (e) {
			if (e.name === 'not_found') {
				paymentListDoc = { _id: 'paymentList', value: [] };
			} else {
				throw e;
			}
		}
		paymentListDoc.value.push(payment);
		await settingsDB.put(paymentListDoc);
		dispatch(getSettingsAction());
	};
};

export const editPaymentAction = (index, payment) => {
	return async dispatch => {
		const paymentListDoc = await settingsDB.get('paymentList');
		paymentListDoc.value[index] = payment;
		await settingsDB.put(paymentListDoc);
		dispatch(getSettingsAction());
	};
};

export const deletePaymentAction = (index) => {
	return async dispatch => {
		const paymentListDoc = await settingsDB.get('paymentList');
		paymentListDoc.value.splice(index, 1);
		await settingsDB.put(paymentListDoc);
		dispatch(getSettingsAction());
	};
};