import PouchDB from 'pouchdb';
import pouchdbAuthentication from 'pouchdb-authentication';

PouchDB.plugin(pouchdbAuthentication);

let couchdb = new PouchDB('https://couchdb.nanbean.net/settings_nanbean', { skip_setup: true }); // eslint-disable-line camelcase

export const login = async (username, password) => {
	const response = await couchdb.login(username, password);
	return response;
};

export const logout = async () => {
	const response = await couchdb.logout();
	return response;
};

export const checkAuthState = async () => {
	const response = await couchdb.getSession();
	return response;
};

// export default class DB {
// 	constructor () {
// 		localDB.sync(couchdb, { live: true, retry: true }).on('complete', function () {
// 			console.log('sync done');
// 		}).on('error', function (err) {
// 			console.log('sync error');
// 		});
// 	}

// 	async getAllDocs () {
// 		const allDocs = await this.localDB.allDocs({ include_docs: true });
// 		let retDocs = {};

// 		allDocs.rows.forEach(d => retDocs[d.id] = d.doc);

// 		return retDocs;
// 	}
  
// 	async login (username, password) {
// 		remoteDB.login(username, password, (err, response) => {
// 			if (err) {
// 				console.log('err', err);
// 			} else {
// 				console.log('response', response);
// 			}
// 		});
// 	}
  
// 	async checkAuthState () {
// 		remoteDB.getSession((err, response) => {
// 			if (err) {
// 				console.log('err', err);
// 			} else {
// 				console.log('response', response);
// 			}
// 		});
// 	}
// }