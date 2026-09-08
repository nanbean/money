const CronJob = require('cron').CronJob;
const calendar = require('../utils/calendar');
const { arrangeUSHistorical, arrangeKRHistorical } = require('./historyService');
const { arrangeExchangeRate } = require('./settingService');
const { arrangeKRInvestmemt, arrangeUSInvestmemt } = require('./investmentService');
const { updateAccountList, repriceAccounts } = require('./accountService');
const { sendBalanceUpdateNotification } = require('./notificationService');
const { updateLifeTimePlanner, updateNetWorth, updateNetWorthDaily } = require('./reportService');
const checkAndSendNotification = require('./paymentService');
const { updateUSStockList } = require('./usStockListService');
const { updateKRStockList } = require('./krStockListService');
const { getWeeklyRecap } = require('./aiService');
const { updateSp500 } = require('./benchmarkService');

const safeRun = async (name, fn) => {
	try {
		await fn();
	} catch (err) {
		// err가 Error가 아니거나 message가 비어 있어도 원인을 잃지 않도록
		// stack → message → 원본 err 순으로 폴백해서 남긴다.
		console.error(`[scheduler] ${name} failed:`, err?.stack || err?.message || err);
	}
};

// 수동 'Refresh Price' 전용 경로다. 크론은 아래에서 개별 함수를 직접 부른다.
//
// 예전에는 파생 리포트까지 응답 안에서 기다렸다. updateLifeTimePlanner 는
// Google Sheets 에 쓰느라 14초가 걸리는데(실측 로그), 화면의 자산 숫자와는
// 아무 관계가 없다. 버튼을 누른 사람이 그걸 기다릴 이유가 없다.
//
// 계좌 갱신도 재가격만 한다 — 거래는 바뀌지 않았다 (repriceAccounts 주석 참고).
const updateInvestmentPrice = async () => {
	// Stage 1: 외부 조회. 서로 의존하지 않으므로 병렬.
	await Promise.all([
		safeRun('arrangeExchangeRate', arrangeExchangeRate),
		safeRun('arrangeKRInvestmemt', arrangeKRInvestmemt),
		safeRun('arrangeUSInvestmemt', arrangeUSInvestmemt)
	]);

	// Stage 2: 새 가격을 보유 종목에 반영한다. 여기까지가 화면에 필요한 것이다.
	// 클라이언트는 accounts·stocks·settings 를 live sync 하므로 이 쓰기가
	// 곧 화면 갱신이다.
	await safeRun('repriceAccounts', repriceAccounts);

	// Stage 3: 파생 리포트. 응답을 붙잡지 않는다.
	//
	// await 하지 않으므로 safeRun 의 try/catch 가 유일한 방어선이다 — 여기서
	// 던지면 unhandled rejection 이 된다. safeRun 은 항상 삼킨다.
	Promise.all([
		safeRun('updateLifeTimePlanner', updateLifeTimePlanner),
		safeRun('updateNetWorth', updateNetWorth),
		safeRun('updateNetWorthDaily', updateNetWorthDaily)
	]).then(() => console.log('updateInvestmentPrice: 파생 리포트 갱신 완료'));
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
			await safeRun('updateSp500', updateSp500);
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

	new CronJob('00 00 17 * * 5', async () => {
		/*
			 * Weekly recap AI analysis pre-generation.
			 * Runs every Friday at 17:00 PT (America/Los_Angeles) — right after
			 * US after-hours trading closes (5PM PT = 8PM ET extended-hours end).
			 * Pre-caches the AI analysis so it's ready when user opens the app over the weekend.
			 */
		console.log('weeklyRecap Friday 17:00 PT started');
		// 주 1회짜리 잡이라 실패하면 다음 기회가 일주일 뒤다. Gemini 503('high demand')
		// 스파이크는 분 단위로 이어지므로 기본 재시도 예산(약 7초)으로는 거의 못 넘긴다.
		// 이 경로는 사용자가 기다리는 요청이 아니므로 총 6~8분(6회 시도)까지 버틴다.
		await safeRun('weeklyRecap', () => getWeeklyRecap({
			retryOptions: { retries: 5, baseDelay: 20000, maxDelay: 120000 }
		}));
		console.log('weeklyRecap Friday 17:00 PT ended');
	}, null, true, 'America/Los_Angeles');
})();

module.exports = {
	updateInvestmentPrice
};