const { transactionsDB } = require('./index');
const pouchdb = require('./pouchdb');

const getAllTransactions = async () => {
	return pouchdb.getAllTransactions();
};

const insertTransaction = async (transaction) => {
	return await transactionsDB.insert(transaction);
};

module.exports = {
	getAllTransactions,
	insertTransaction
};
