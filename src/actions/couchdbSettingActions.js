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
		const general = await settingsDB.get('general');
		general[key] = value;
		await settingsDB.put(general);

		dispatch({
			type: SET_SETTINGS,
			payload: [general]
		});
	};
};

export const addCategoryAction = (value) => {
	return async dispatch => {
		const categoryList = await settingsDB.get('categoryList');
		categoryList.data.push(value);
		categoryList.data.sort();
		await settingsDB.put(categoryList);

		dispatch({
			type: SET_SETTINGS,
			payload: [
				categoryList
			]
		});
	};
};

export const deleteCategoryAction = (index) => {
	return async dispatch => {
		const categoryList = await settingsDB.get('categoryList');
		categoryList.data.splice(index, 1);
		await settingsDB.put(categoryList);

		dispatch({
			type: SET_SETTINGS,
			payload: [
				categoryList
			]
		});
	};
};

export const updateCategoryAction = (index, value) => {
	return async dispatch => {
		const categoryList = await settingsDB.get('categoryList');
		categoryList.data[index] = value;
		await settingsDB.put(categoryList);

		dispatch({
			type: SET_SETTINGS,
			payload: [
				categoryList
			]
		});
	};
};