const moment = require('moment-timezone');
const { getSettings } = require('../db/settingDB');
const { getAllTransactions } = require('./transactionService');
const { sendNotification } = require('./messaging');

// 이 규칙은 src/setting/PaymentList/paymentPaid.js 의 isPaymentPaid 와 같아야
// 한다. 화면의 '납부' 표시가 이 판정과 어긋나면, 이미 처리한 항목을 두고
// '미납 N건' 푸시가 계속 온다. 한쪽을 고치면 다른 쪽도 고쳐야 한다.
const isPaid = (payment, transactions) => {
	const interval = payment.interval || 1;
	const startYearMonth = moment().subtract(interval - 1, 'months').format('YYYY-MM');
	const thisYearMonth = moment().format('YYYY-MM');
	return transactions.some(t => {
		if (!t.accountId) return false;
		const accountName = t.accountId.split(':')[2];
		if (payment.account === accountName && payment.payee === t.payee && payment.category === t.category) {
			if (!payment.subcategory || payment.subcategory === t.subcategory) {
				const paidYearMonth = moment(t.date).format('YYYY-MM');
				if (paidYearMonth >= startYearMonth && paidYearMonth <= thisYearMonth) {
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
module.exports.isPaid = isPaid;
