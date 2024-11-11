const config = require('./config');
const CronJob = require('cron').CronJob;
const PouchDB = require('pouchdb');
const debounce = require('lodash.debounce');

const transactionsDB = new PouchDB('transactions');

let allTransactions = [];

const updateAllTransactions = async () => {
	const transactionsResponse = await transactionsDB.allDocs({ include_docs: true });
	allTransactions = transactionsResponse.rows.map(i => i.doc);
};

const updateAllTransactionsDebounce = debounce(updateAllTransactions, 1000);

const initPouchDB = () => {
	let remoteTransactionsDB = new PouchDB(`https://${config.couchDBAdminId}:${config.couchDBAdminPassword}@${config.couchDBUrl}/transactions_nanbean`, { skip_setup: true }); // eslint-disable-line camelcase
	PouchDB.replicate(remoteTransactionsDB, transactionsDB, { live: true, retry: true }).on('change', function ({ change, deleted }) {
		updateAllTransactionsDebounce();
		console.log('transaction change');
	});
};

exports.getAllTransactions = async () => {
	if (allTransactions.length > 0) {
		return allTransactions;
	}

	await updateAllTransactions();
	return allTransactions;
};

new CronJob('00 00 01 * * *', async () => {
	updateAllTransactionsDebounce();
}, () => {
}, true, 'America/Los_Angeles');

new CronJob('00 29 15 * * 1-5', async () => {
	updateAllTransactionsDebounce();
}, () => {
}, true, 'Asia/Seoul');

new CronJob('00 59 12 * * 1-5', async () => {
	updateAllTransactionsDebounce();
}, () => {
}, true, 'America/Los_Angeles');

initPouchDB();