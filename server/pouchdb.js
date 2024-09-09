const config = require('./config');
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

initPouchDB();