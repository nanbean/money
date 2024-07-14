import PouchDB from 'pouchdb';

import {
	SET_LIFETIME_PLANNER_FLOW,
	SET_NET_WORTH_FLOW
} from './actionTypes';

import { COUCHDB_URL } from '../constants';

let reportsDB = new PouchDB('reports');
let reportsSync;

export const initCouchdbReportAction = username => {
	return async dispatch => {
		let remoteReportsDB = new PouchDB(`https://${COUCHDB_URL}/reports_${username}`, { skip_setup: true }); // eslint-disable-line camelcase
		reportsSync = reportsDB.sync(remoteReportsDB, {})
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
	};
};

export const finalizeCouchdbReportAction = () => {
	return async () => {
		reportsSync && reportsSync.cancel();
	};
};

export const getLifetimeFlowAction = () => {
	return async dispatch => {
		const lifetimeplanner = await reportsDB.get('lifetimeplanner');

		dispatch({
			type: SET_LIFETIME_PLANNER_FLOW,
			payload: lifetimeplanner.data
		});
	};
};

export const getNetWorthFlowAction = () => {
	return async dispatch => {
		const netWorth = await reportsDB.get('netWorth');

		dispatch({
			type: SET_NET_WORTH_FLOW,
			payload: netWorth.data
		});
	};
};