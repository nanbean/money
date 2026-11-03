const { transactionsDB } = require('./index');
const pouchdb = require('./pouchdb');

const getAllTransactions = async () => {
	return pouchdb.getAllTransactions();
};

const insertTransaction = async (transaction) => {
	return await transactionsDB.insert(transaction);
};

const bulkTransactions = async (docs) => {
	return await transactionsDB.bulk({ docs });
};

module.exports = {
	getAllTransactions,
	insertTransaction,
	bulkTransactions
};
