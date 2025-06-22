const { notificationsDB } = require('../db');
const messaging = require('../messaging');
const { getAllAccounts } = require('./accountService');
const { getExchangeRate } = require('./settingService');

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
	const balance = allAccounts.filter(i => !i.name.match(/_Cash/i)).map(i => i.currency === 'USD' ? i.balance * exchangeRate : i.balance).reduce((prev, curr) => prev + curr, 0);
	const netWorth = parseInt(balance, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	messaging.sendNotification('NetWorth Update', `Today's NetWorth is ${netWorth}`, 'graph');
};

module.exports = {
	addNotification,
	listNotifications,
	sendBalanceUpdateNotification
};