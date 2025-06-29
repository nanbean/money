const { notificationsDB } = require('../db');
const messaging = require('../messaging');
const { getAllAccounts } = require('./accountService');
const { getExchangeRate, getCurrency } = require('./settingService');

const addNotification = async (notification) => {
	await notificationsDB.insert(notification);
};

const listNotifications = async (size) => {
	const notifications = await notificationsDB.list({ include_docs: true });
	return notifications.rows.slice(notifications.rows.length - size, notifications.rows.length).map(i => i.doc.text);
};

const sendBalanceUpdateNotification = async () => {
	const allAccounts = await getAllAccounts();
	const exchangeRate = await getExchangeRate();
	const displayCurrency = await getCurrency();
	const balance = allAccounts
		.filter(account => account?.name && !account.name.match(/_Cash/i))
		.reduce((sum, account) => {
			const accountBalance = account.balance || 0;
			const accountCurrency = account.currency || 'KRW';

			if (accountCurrency === displayCurrency) {
				return sum + accountBalance;
			} else if (displayCurrency === 'KRW' && accountCurrency === 'USD') {
				return sum + (accountBalance * exchangeRate);
			} else if (displayCurrency === 'USD' && accountCurrency === 'KRW') {
				return sum + (accountBalance / exchangeRate);
			}
			return sum;
		}, 0);
	const netWorth = Math.round(balance).toLocaleString(displayCurrency === 'KRW' ? 'ko-KR' : 'en-US', { style: 'currency', currency: displayCurrency });
	messaging.sendNotification('NetWorth Update', `Today's NetWorth is ${netWorth}`, 'graph');
};

module.exports = {
	addNotification,
	listNotifications,
	sendBalanceUpdateNotification
};