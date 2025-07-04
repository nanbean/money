const transactionDB = require('../db/transactionDB');
const { updateAccountList } = require('./accountService');

const getAllTransactions = async () => {
	return await transactionDB.getAllTransactions();
};

const addTransaction = async (transaction) => {
	await transactionDB.insertTransaction(transaction);
	await updateAccountList();
};

module.exports = {
	getAllTransactions,
	addTransaction
};