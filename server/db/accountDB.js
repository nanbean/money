const { accountsDB } = require('./index');

const listAccounts = async () => {
	const accountsResponse = await accountsDB.list({ include_docs: true });
	return accountsResponse.rows.map(i => i.doc);
};

const bulkAccounts = async (docs) => {
	return await accountsDB.bulk({ docs });
};

module.exports = {
	listAccounts,
	bulkAccounts
};
