const { historiesDB } = require('./index');

const listHistories = async () => {
	const historiesResponse = await historiesDB.list({ include_docs: true });
	return historiesResponse.rows.map(i => i.doc);
};

const bulkDocs = async (docs) => {
	return await historiesDB.bulk({ docs });
};

const getDoc = async (id) => {
	try {
		return await historiesDB.get(id);
	} catch (err) {
		if (err.statusCode === 404) return null;
		throw err;
	}
};

const putDoc = async (doc) => {
	return await historiesDB.insert(doc);
};

module.exports = {
	listHistories,
	bulkDocs,
	getDoc,
	putDoc
};
