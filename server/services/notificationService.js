const notificationDB = require('../db/notificationDB');
const messaging = require('./messaging');
const { getAllAccounts } = require('./accountService');
const { getExchangeRate, getCurrency } = require('./settingService');

const addNotification = async (notification) => {
	await notificationDB.addNotification(notification);
};

const listNotifications = async (size) => {
	const notifications = await notificationDB.listNotifications(size);
	// The result is in descending order (newest first), so we reverse it to get chronological order.
	return notifications.map(i => {
		const doc = i;
		if (doc.title) {
			return `title: '${doc.title}', text: '${doc.text}'`;
		}
		return `text: '${doc.text}'`;
	}).reverse();
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