const CronJob = require('cron').CronJob;
const calendar = require('../utils/calendar');
const { arrangeUSHistorical, arrangeKRHistorical } = require('./historyService');
const { arrangeExchangeRate } = require('./settingService');
const { arrangeKRInvestmemt, arrangeUSInvestmemt } = require('./investmentService');
const { updateAccountList } = require('./accountService');
const { sendBalanceUpdateNotification } = require('./notificationService');
const { updateLifeTimePlanner, updateNetWorth, updateNetWorthDaily } = require('./reportService');
const checkAndSendNotification = require('./paymentService');
const { updateUSStockList } = require('./usStockListService');
const { updateKRStockList } = require('./krStockListService');
const { getWeeklyRecap } = require('./aiService');

const safeRun = async (name, fn) => {
	try {
		await fn();
	} catch (err) {
		console.error(`[scheduler] ${name} failed:`, err.message);
	}
};

const updateInvestmentPrice = async () => {
	// Stage 1: independent external fetches — exchange rate + KR/US prices.
	// Run in parallel since none depend on each other.
	await Promise.all([
		safeRun('arrangeExchangeRate', arrangeExchangeRate),
		safeRun('arrangeKRInvestmemt', arrangeKRInvestmemt),
		safeRun('arrangeUSInvestmemt', arrangeUSInvestmemt)
	]);
	// Stage 2: account balances need updated prices + exchange rate from stage 1.
	await safeRun('updateAccountList', updateAccountList);
	// Stage 3: derived reports — all read account list, independent of each other.
	await Promise.all([
		safeRun('updateLifeTimePlanner', updateLifeTimePlanner),
		safeRun('updateNetWorth', updateNetWorth),
		safeRun('updateNetWorthDaily', updateNetWorthDaily)
	]);
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
			await safeRun('arrangeExchangeRate', arrangeExchangeRate);
			await safeRun('arrangeKRInvestmemt', arrangeKRInvestmemt);
			await safeRun('arrangeUSInvestmemt', arrangeUSInvestmemt);
			await safeRun('updateAccountList', updateAccountList);
			await safeRun('sendBalanceUpdateNotification', sendBalanceUpdateNotification);
			await safeRun('updateLifeTimePlanner', updateLifeTimePlanner);
			await safeRun('updateNetWorth', updateNetWorth);
			await safeRun('updateNetWorthDaily', updateNetWorthDaily);
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
			await safeRun('arrangeExchangeRate', arrangeExchangeRate);
			await safeRun('arrangeUSInvestmemt', arrangeUSInvestmemt);
			await safeRun('updateAccountList', updateAccountList);
			await safeRun('sendBalanceUpdateNotification', sendBalanceUpdateNotification);
			await safeRun('updateLifeTimePlanner', updateLifeTimePlanner);
			await safeRun('updateNetWorth', updateNetWorth);
			await safeRun('updateNetWorthDaily', updateNetWorthDaily);
		} else {
			console.log('US holiday, dailyArrangeInvestmemtjob skip');
		}
	}, () => {
		/* This function is executed when the job stops */
		console.log('30 00 13 daily dailyArrangeInvestmemtjob ended');
	}, true, 'America/Los_Angeles');

	new CronJob('00 00 09 * * *', async () => {
		console.log('payment 00 00 09 daily checkAndSendNotification started');
		await safeRun('checkAndSendNotification', checkAndSendNotification);
	}, () => {
		/* This function is executed when the job stops */
		console.log('00 00 09 daily checkAndSendNotification ended');
	}, true, 'America/Los_Angeles');

	new CronJob('00 00 04 1 * *', async () => {
		/*
			 * US stock list update automation.
			 * Runs every 1st day of month at 04:00 AM (America/Los_Angeles).
			 */
		console.log('usStockList 00 00 04 monthly updateUSStockList started');
		await updateUSStockList();
		console.log('usStockList 00 00 04 monthly updateUSStockList ended');
	}, () => {
		console.log('usStockList monthly job ended');
	}, true, 'America/Los_Angeles');

	new CronJob('00 00 04 1 * *', async () => {
		/*
			 * KR stock list update automation.
			 * Runs every 1st day of month at 04:00 AM (Asia/Seoul).
			 */
		console.log('krStockList 00 00 04 monthly updateKRStockList started');
		await updateKRStockList();
		console.log('krStockList 00 00 04 monthly updateKRStockList ended');
	}, () => {
		console.log('krStockList monthly job ended');
	}, true, 'Asia/Seoul');

	new CronJob('00 00 16 * * 5', async () => {
		/*
			 * Weekly recap AI analysis pre-generation.
			 * Runs every Friday at 16:00 PT (America/Los_Angeles).
			 * US market closes Friday 4PM ET = 1PM PT, so 4PM PT is right after close.
			 * Pre-caches the AI analysis so it's ready when user opens the app over the weekend.
			 */
		console.log('weeklyRecap Friday 16:00 PT started');
		await getWeeklyRecap().catch(err => console.error('weeklyRecap scheduled job error:', err));
		console.log('weeklyRecap Friday 16:00 PT ended');
	}, null, true, 'America/Los_Angeles');
})();

module.exports = {
	updateInvestmentPrice
};