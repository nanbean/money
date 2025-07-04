const { reportsDB } = require('./index');

const getReport = async (id) => {
	return await reportsDB.get(id, { revs_info: true });
};

const insertReport = async (report) => {
	return await reportsDB.insert(report);
};

module.exports = {
	getReport,
	insertReport
};
