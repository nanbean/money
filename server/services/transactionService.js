const { transactionsDB } = require('../db');
const { updateAccountList } = require('./accountService');

const getAllTransactions = async () => {
	const allTransactions = await transactionsDB.list({ include_docs: true });
	const transactions = allTransactions.rows.map(i => i.doc);

	return transactions;
};

const addTransaction = async (transaction) => {
	await transactionsDB.insert(transaction);
	await updateAccountList();
};

module.exports = {
	getAllTransactions,
	addTransaction
};