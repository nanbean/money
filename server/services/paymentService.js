const moment = require('moment-timezone');
const { getSettings } = require('../db/settingDB');
const { getAllTransactions } = require('./transactionService');
const { sendNotification } = require('./messaging');

const isPaid = (payment, transactions) => {
	const thisYearMonth = moment().format('YYYY-MM');
	return transactions.some(t => {
		const accountName = t.accountId.split(':')[2];
		if (payment.account === accountName && payment.payee === t.payee && payment.category === t.category) {
			if (!payment.subcategory || payment.subcategory === t.subcategory) {
				const paidYearMonth = moment(t.date).format('YYYY-MM');
				if (thisYearMonth === paidYearMonth) {
					return true;
				}
			}
		}
		return false;
	});
};

const checkAndSendNotification = async () => {
	const settings = await getSettings();
	const transactions = await getAllTransactions();
	const paymentList = settings.find(i => i._id === 'paymentList')?.value || [];
	const today = moment().date();
	const unpaidItems = paymentList.filter(item => {
		if (item.day && today < item.day) {
			return false;
		}
		return item.valid && !isPaid(item, transactions);
	});

	if (unpaidItems.length > 0) {
		const notificationTitle = 'Unpaid Items Found';
		const notificationBody = `You have ${unpaidItems.length} unpaid items in your payment list.`;

		sendNotification(notificationTitle, notificationBody, 'receipt')
			.then(() => {
				console.log('Notification sent successfully.');
			})
			.catch((error) => {
				console.error('Error sending notification:', error);
			});
	} else {
		console.log('No unpaid items found.');
	}
};

module.exports = checkAndSendNotification;
