const { historiesDB } = require('./index');

const listHistories = async () => {
	const historiesResponse = await historiesDB.list({ include_docs: true });
	return historiesResponse.rows.map(i => i.doc);
};

const bulkDocs = async (docs) => {
	return await historiesDB.bulk({ docs });
};

module.exports = {
	listHistories,
	bulkDocs
};
