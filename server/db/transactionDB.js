const { transactionsDB } = require('./index');

const getAllTransactions = async () => {
	const allTransactions = await transactionsDB.list({ include_docs: true });
	return allTransactions.rows.map(i => i.doc);
};

const insertTransaction = async (transaction) => {
	return await transactionsDB.insert(transaction);
};

module.exports = {
	getAllTransactions,
	insertTransaction
};
