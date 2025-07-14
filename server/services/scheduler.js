const CronJob = require('cron').CronJob;
const calendar = require('../utils/calendar');
const { arrangeUSHistorical, arrangeKRHistorical } = require('./historyService');
const { arrangeExchangeRate } = require('./settingService');
const { arrangeKRInvestmemt, arrangeUSInvestmemt } = require('./investmentService');
const { updateAccountList } = require('./accountService');
const { sendBalanceUpdateNotification } = require('./notificationService');
const { updateLifeTimePlanner, updateNetWorth } = require('./reportService');

const updateInvestmentPrice = async () => {
	await arrangeExchangeRate();
	await arrangeKRInvestmemt();
	await arrangeUSInvestmemt();
	await updateAccountList();
	await updateLifeTimePlanner();
	await updateNetWorth();
};

(async () => {
	await calendar.initialize();
	console.log('Calendar initialized. Starting cron jobs.');

	new CronJob('00 33 05 1 * *', async () => {
		/*
			 * update historical automation.
			 * Runs every 1st day of month, and write last day of previous month price
			 * at 03:00:00 AM.
			 */
		console.log('stock 00 33 05 monthly monthlyUpdateHistoricaljob started');
		await arrangeKRHistorical();
	}, () => {
		/* This function is executed when the job stops */
		console.log('00 33 05 monthly monthlyUpdateHistoricaljob ended');
	}, true, 'Asia/Seoul');

	new CronJob('00 33 05 1 * *', async () => {
		/*
			 * update historical automation.
			 * Runs every 1st day of month, and write last day of previous month price
			 * at 03:00:00 AM.
			 */
		console.log('stock 00 33 05 monthly monthlyUpdateHistoricaljob started');
		await arrangeUSHistorical();
	}, () => {
		/* This function is executed when the job stops */
		console.log('00 33 05 monthly monthlyUpdateHistoricaljob ended');
	}, true, 'America/Los_Angeles');

	new CronJob('30 30 15 * * 1-5', async () => {
		/*
			 * investment update automation.
			 * Runs week day (Monday through Friday)
			 * at 05:00:00 AM.
			 */
		console.log('couchdb 30 30 15 daily dailyArrangeInvestmemtjob started');
		if (!calendar.isHoliday()) {
			await arrangeExchangeRate();
			await arrangeKRInvestmemt();
			await arrangeUSInvestmemt();
			await updateAccountList();
			await sendBalanceUpdateNotification();
			await updateLifeTimePlanner();
			await updateNetWorth();
		} else {
			console.log('holiday, dailyArrangeInvestmemtjob skip');
		}
	}, () => {
		/* This function is executed when the job stops */
		console.log('30 30 15 daily dailyArrangeInvestmemtjob ended');
	}, true, 'Asia/Seoul');

	new CronJob('30 00 13 * * 1-5', async () => {
		/*
			 * investment update automation.
			 * Runs week day (Monday through Friday)
			 * at 05:00:00 AM.
			 */
		console.log('couchdb 30 00 13 daily dailyArrangeInvestmemtjob started');
		if (!calendar.isUsHoliday()) {
			await arrangeExchangeRate();
			await arrangeUSInvestmemt();
			await updateAccountList();
			await sendBalanceUpdateNotification();
			await updateLifeTimePlanner();
			await updateNetWorth();
		} else {
			console.log('US holiday, dailyArrangeInvestmemtjob skip');
		}
	}, () => {
		/* This function is executed when the job stops */
		console.log('30 00 13 daily dailyArrangeInvestmemtjob ended');
	}, true, 'America/Los_Angeles');
})();

module.exports = {
	updateInvestmentPrice
};