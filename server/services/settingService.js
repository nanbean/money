const { settingsDB } = require('../db');
const { getKisToken, getKisExchangeRate } = require('../kisConnector');

const getSettings = async () => {
	const settingsResponse = await settingsDB.list({ include_docs: true });
	const settings = settingsResponse.rows.map(i => i.doc);

	return settings;
};

const getExchangeRate = async () => {
	const settings = await getSettings();
	const general = settings.find(i => i._id === 'general');

	if (general && general.exchangeRate) {
		return general.exchangeRate;
	}

	return 1000;
};

const getCategoryList = async () => {
	const settings = await getSettings();
	const categoryList = settings.find(i => i._id === 'categoryList');

	if (categoryList && categoryList.data) {
		return categoryList.data;
	}

	return [];
};

const arrangeExchangeRate = async () => {
	const settingsResponse = await settingsDB.list({ include_docs: true });
	const settings = settingsResponse.rows.map(i => i.doc);
	const general = settings.find(i => i._id === 'general');

	if (general && general.enableExchangeRateUpdate) {
		const accessToken = await getKisToken();
		const kisExchangeRate = await getKisExchangeRate(accessToken);
		if (kisExchangeRate) {
			general.exchangeRate = kisExchangeRate;
			await settingsDB.insert(general);
		}
	}
};

module.exports = {
	getSettings,
	getExchangeRate,
	getCategoryList,
	arrangeExchangeRate
};