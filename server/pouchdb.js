const config = require('./config');
const PouchDB = require('pouchdb');
const debounce = require('lodash.debounce');
const { Mutex } = require('async-mutex');

const transactionsDB = new PouchDB('transactions');

let allTransactions = [];
const mutex = new Mutex();

const updateAllTransactions = async () => {
    const release = await mutex.acquire();
    try {
        const transactionsResponse = await transactionsDB.allDocs({ include_docs: true });
        allTransactions = transactionsResponse.rows.map(i => i.doc);
    } finally {
        release();
    }
};

const updateAllTransactionsDebounce = debounce(updateAllTransactions, 1000);

const initPouchDB = () => {
    let remoteTransactionsDB = new PouchDB(`https://${config.couchDBAdminId}:${config.couchDBAdminPassword}@${config.couchDBUrl}/transactions_nanbean`, { skip_setup: true }); // eslint-disable-line camelcase
    PouchDB.replicate(remoteTransactionsDB, transactionsDB, { live: true, retry: true }).on('change', function ({ change, deleted }) {
        mutex.runExclusive(() => {
            allTransactions = [];
        }).then(() => {
            updateAllTransactionsDebounce();
        });
        console.log('transaction change');
    });
};

exports.getAllTransactions = async () => {
    if (await mutex.runExclusive(() => allTransactions.length > 0)) {
        return allTransactions;
    }

    await updateAllTransactions();
    return allTransactions;
};

initPouchDB();