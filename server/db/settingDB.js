const { settingsDB } = require('./index');

const getSettings = async () => {
	const settingsResponse = await settingsDB.list({ include_docs: true });
	return settingsResponse.rows.map(i => i.doc);
};

const insertSetting = async (setting) => {
	return await settingsDB.insert(setting);
};

module.exports = {
	getSettings,
	insertSetting
};
