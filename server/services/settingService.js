const settingDB = require('../db/settingDB');
const { getKisToken, getKisExchangeRate } = require('./kisConnector');

const getSettings = async () => {
	return await settingDB.getSettings();
};

const getExchangeRate = async () => {
	const settings = await getSettings();
	const exchangeRateSetting = settings.find(i => i._id === 'exchangeRate');

	if (exchangeRateSetting && exchangeRateSetting.value) {
		return exchangeRateSetting.value;
	}

	return 1000;
};

const getCurrency = async () => {
	const settings = await getSettings();
	const currencySetting = settings.find(i => i._id === 'currency');

	if (currencySetting && currencySetting.value) {
		return currencySetting.value;
	}

	return 'KRW';
};

const getCategoryList = async () => {
	const settings = await getSettings();
	const categoryList = settings.find(i => i._id === 'categoryList');

	if (categoryList && categoryList.value) {
		return categoryList.value;
	}

	return [];
};

const arrangeExchangeRate = async () => {
	const settings = await settingDB.getSettings();
	const enableExchangeRateUpdate = settings.find(i => i._id === 'enableExchangeRateUpdate');
	const exchangeRateSetting = settings.find(i => i._id === 'exchangeRate');

	if (enableExchangeRateUpdate && enableExchangeRateUpdate.value) {
		const accessToken = await getKisToken();
		const kisExchangeRate = await getKisExchangeRate(accessToken);
		if (kisExchangeRate) {
			exchangeRateSetting.value = kisExchangeRate;
			await settingDB.insertSetting(exchangeRateSetting);
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