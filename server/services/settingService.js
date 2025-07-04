const settingDB = require('../db/settingDB');
const { getKisToken, getKisExchangeRate } = require('./kisConnector');

const getSettings = async () => {
	return await settingDB.getSettings();
};

const getExchangeRate = async () => {
	const settings = await getSettings();
	const general = settings.find(i => i._id === 'general');

	if (general && general.exchangeRate) {
		return general.exchangeRate;
	}

	return 1000;
};

const getCurrency = async () => {
	const settings = await getSettings();
	const general = settings.find(i => i._id === 'general');

	if (general && general.currency) {
		return general.currency;
	}

	return 'KRW';
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
	const settings = await settingDB.getSettings();
	const general = settings.find(i => i._id === 'general');

	if (general && general.enableExchangeRateUpdate) {
		const accessToken = await getKisToken();
		const kisExchangeRate = await getKisExchangeRate(accessToken);
		if (kisExchangeRate) {
			general.exchangeRate = kisExchangeRate;
			await settingDB.insertSetting(general);
		}
	}
};

module.exports = {
	getSettings,
	getExchangeRate,
	getCurrency,
	getCategoryList,
	arrangeExchangeRate
};