const config = require('./config');
const PouchDB = require('pouchdb');

const transactionsDB = new PouchDB('transactions');

const initPouchDB = () => {
	let remoteTransactionsDB = new PouchDB(`https://${config.couchDBAdminId}:${config.couchDBAdminPassword}@${config.couchDBUrl}/transactions_nanbean`, { skip_setup: true }); // eslint-disable-line camelcase
	transactionsDB.sync(remoteTransactionsDB, { live: true, retry: true }).on('change', function ({ change, deleted }) {
		console.log('transaction change');
	});
};

exports.getAllTransactions = async () => {
	const transactionsResponse = await transactionsDB.allDocs({include_docs: true});
	return transactionsResponse.rows.map(i => i.doc);
};

initPouchDB();
