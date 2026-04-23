const moment = require('moment-timezone');
const _ = require('lodash');
const reportDB = require('../db/reportDB');
const accountDB = require('../db/accountDB');
const transactionDB = require('../db/transactionDB');
const stockDB = require('../db/stockDB');
const historyDB = require('../db/historyDB');
const spreadSheet = require('../utils/spreadSheet');
const { getInvestmentList, getInvestmentBalance } = require('../utils/investment');
const { getBalance } = require('../utils/account');
const { getExchangeRate } = require('./settingService');
const { getAllAccounts } = require('./accountService');

const updateLifeTimePlanner = async () => {
	console.time('updateLifeTimePlanner');
	console.log('updateLifeTimePlanner start', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));
	const [oldLifeTimePlanner, accounts] = await Promise.all([
		reportDB.getReport('lifetimeplanner').catch(err => { console.log(err); return null; }),
		getAllAccounts()
	]);
	const { data, events } = await spreadSheet.getLifetimeFlowList(accounts);

	// 변경 감지: 데이터/이벤트가 달라진 경우만 CouchDB 업데이트
	const dataChanged = !oldLifeTimePlanner?.data ||
		oldLifeTimePlanner.data[0]?.amount !== data[0]?.amount ||
		oldLifeTimePlanner.data[0]?.netFlow !== data[0]?.netFlow ||
		oldLifeTimePlanner.data[data.length - 1]?.amount !== data[data.length - 1]?.amount;
	const eventsChanged = JSON.stringify(oldLifeTimePlanner?.events) !== JSON.stringify(events);

	if (!dataChanged && !eventsChanged) {
		console.log('updateLifeTimePlanner: no changes detected, skipping');
		console.timeEnd('updateLifeTimePlanner');
		return;
	}

	const transaction = {
		_id: 'lifetimeplanner',
		date: new Date(),
		data,
		events
	};

	if (oldLifeTimePlanner) {
		transaction._rev = oldLifeTimePlanner._rev;
	}

	await reportDB.insertReport(transaction);

	console.log('updateLifeTimePlanner done');
	console.timeEnd('updateLifeTimePlanner');
};

const getLifetimeFlowList = async () => {
	const lifeTimePlanner = await reportDB.getReport('lifetimeplanner');
	return lifeTimePlanner.data;
};

const getNetWorth = async (allAccounts, allTransactions, transactionsByAccount, allInvestments, histories, date, preloadedExchangeRate) => {
	let cashNetWorth = 0;
	let investmentsNetWorth = 0;
	let loanNetWorth = 0;
	let netInvestments = [];
	let assetNetWorth = 0;
	const exchangeRate = preloadedExchangeRate !== undefined ? preloadedExchangeRate : await getExchangeRate();

	// Build historiesMap once per getNetWorth call instead of inside every getInvestmentBalance call.
	const historiesMap = histories && histories.length ? new Map(histories.map(h => [h.name, h.data])) : null;

	for (const account of allAccounts) {
		const accountTransactions = transactionsByAccount[`account:${account.type}:${account.name}`] || [];
		const transactions = accountTransactions.filter(i => i.date <= date);
		if (account.type === 'Invst') {
			const investments = getInvestmentList(allInvestments, allTransactions, transactions);
			const balance = getInvestmentBalance(investments, date, histories, historiesMap);
			netInvestments = [...netInvestments, ...investments].filter(i => i.quantity > 0);
			investmentsNetWorth += account.currency === 'USD' ? balance * exchangeRate:balance;
		} else if (account.type === 'Oth A') {
			const balance = getBalance(account.name, transactions);
			assetNetWorth += account.currency === 'USD' ? balance * exchangeRate:balance;
		} else if (account.type === 'Oth L') {
			const balance = getBalance(account.name, transactions);
			loanNetWorth += account.currency === 'USD' ? balance * exchangeRate:balance;
		} else if (account.name.match(/_Cash/)) {
			const invAccountId = `account:Invst:${account.name.split('_')[0]}`;
			const invAllTransactions = transactionsByAccount[invAccountId] || [];
			const invTransactions = invAllTransactions.filter(i => i.date <= date);
			const balance = getBalance(account.name, transactions, invTransactions);
			investmentsNetWorth += account.currency === 'USD' ? balance * exchangeRate:balance;
		} else {
			const balance = getBalance(account.name, transactions);
			cashNetWorth += account.currency === 'USD' ? balance * exchangeRate:balance;
		}
	}

	return {
		netWorth: cashNetWorth + investmentsNetWorth + loanNetWorth + assetNetWorth,
		cashNetWorth,
		investmentsNetWorth,
		loanNetWorth,
		assetNetWorth,
		netInvestments,
		movableAsset: cashNetWorth + investmentsNetWorth + loanNetWorth,
		exchangeRate
	};
};

// Always recalculate the current month to reflect today's stock prices.
// All other months are handled by fingerprint-based change detection.
const RECALC_MONTHS = 1;

const updateNetWorth = async () => {
	console.log('updateNetWorth start', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));
	console.time('updateNetWorth');
	let dates = [];
	const date = new Date();
	const currentYear = date.getFullYear();
	const currentMonth = date.getMonth() + 1;

	for (let i = 2005; i <= currentYear; i++) {
		for (let j = 1; j <= (i === currentYear ? currentMonth : 12); j++) {
			if (j === 1 || j === 3 || j === 5 || j === 7 || j === 8 || j === 10 || j === 12) {
				dates.push(`${i}-${_.padStart(j, 2, '0')}-31`);
			} else if (j === 2) {
				if (((i % 4 === 0) && (i % 100 !== 0)) || (i % 400 === 0)) {
					dates.push(`${i}-${_.padStart(j, 2, '0')}-29`);
				} else {
					dates.push(`${i}-${_.padStart(j, 2, '0')}-28`);
				}
			} else {
				dates.push(`${i}-${_.padStart(j, 2, '0')}-30`);
			}
		}
	}

	const allAccounts = await accountDB.listAccounts();
	const allTransactions = await transactionDB.getAllTransactions();
	const kospiResponse = await stockDB.getStock('kospi');
	const kosdaqResponse = await stockDB.getStock('kosdaq');
	const usResponse = await stockDB.getStock('us');
	const allInvestments = [...kospiResponse.data, ...kosdaqResponse.data, ...usResponse.data];
	const transactionsByAccount = _.groupBy(allTransactions, 'accountId');
	const histories = await historyDB.listHistories();
	const exchangeRate = await getExchangeRate();
	const oldNetWorth = await reportDB.getReport('netWorth').catch(() => null);

	// Build a Map from existing data for O(1) lookup by date string.
	const existingDataMap = new Map((oldNetWorth?.data || []).map(item => [item.date, item]));

	// Build transaction fingerprint (count + amountSum) per month to detect backdated changes.
	// If a transaction is added, deleted, or its amount changed in a historical month,
	// the fingerprint will differ from the stored one and trigger recalculation from that month.
	const txFingerprintByMonth = {};
	for (const tx of allTransactions) {
		const month = tx.date ? tx.date.substring(0, 7) : null;
		if (month) {
			if (!txFingerprintByMonth[month]) {
				txFingerprintByMonth[month] = { count: 0, amountSum: 0 };
			}
			txFingerprintByMonth[month].count += 1;
			txFingerprintByMonth[month].amountSum += (tx.amount || 0);
		}
	}

	// Compare fingerprints with the previous run to find the earliest changed month.
	const storedFingerprint = oldNetWorth?.txFingerprintByMonth || {};
	let earliestChangedMonth = null;
	const allMonths = new Set([...Object.keys(txFingerprintByMonth), ...Object.keys(storedFingerprint)]);
	for (const month of allMonths) {
		const curr = txFingerprintByMonth[month];
		const prev = storedFingerprint[month];
		const changed = !curr || !prev || curr.count !== prev.count || Math.round(curr.amountSum) !== Math.round(prev.amountSum);
		if (changed && (!earliestChangedMonth || month < earliestChangedMonth)) {
			earliestChangedMonth = month;
		}
	}

	// The effective cutoff is the earlier of: fixed window OR the earliest changed month.
	const fixedCutoff = moment().subtract(RECALC_MONTHS - 1, 'months').startOf('month').format('YYYY-MM-DD');
	const dynamicCutoff = earliestChangedMonth ? `${earliestChangedMonth}-01` : fixedCutoff;
	const cutoff = dynamicCutoff < fixedCutoff ? dynamicCutoff : fixedCutoff;

	if (dynamicCutoff < fixedCutoff) {
		console.log(`updateNetWorth: backdated change detected at ${earliestChangedMonth}, extending recalc window`);
	}

	let reusedCount = 0;
	let recalcCount = 0;
	const data = [];

	for (const dateStr of dates) {
		if (dateStr < cutoff && existingDataMap.has(dateStr)) {
			data.push(existingDataMap.get(dateStr));
			reusedCount++;
		} else {
			const { netWorth, cashNetWorth, investmentsNetWorth, loanNetWorth, assetNetWorth, netInvestments, movableAsset } =
				await getNetWorth(allAccounts, allTransactions, transactionsByAccount, allInvestments, histories, dateStr, exchangeRate);
			data.push({ date: dateStr, netWorth, cashNetWorth, investmentsNetWorth, loanNetWorth, assetNetWorth, netInvestments, movableAsset });
			recalcCount++;
		}
	}

	console.log(`updateNetWorth: reused ${reusedCount} months, recalculated ${recalcCount} months`);

	const netWorth = {
		_id: 'netWorth',
		date: new Date(),
		data,
		txFingerprintByMonth
	};

	if (oldNetWorth) {
		netWorth._rev = oldNetWorth._rev;
	}

	await reportDB.insertReport(netWorth);

	console.log('updateNetWorth done');
	console.timeEnd('updateNetWorth');
};

const DAILY_RETENTION_DAYS = 93;

const updateNetWorthDaily = async () => {
	console.log('updateNetWorthDaily start', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));

	const today = moment().tz('Asia/Seoul').format('YYYY-MM-DD');

	const allAccounts = await accountDB.listAccounts();
	const allTransactions = await transactionDB.getAllTransactions();
	const kospiResponse = await stockDB.getStock('kospi');
	const kosdaqResponse = await stockDB.getStock('kosdaq');
	const usResponse = await stockDB.getStock('us');
	const allInvestments = [...kospiResponse.data, ...kosdaqResponse.data, ...usResponse.data];
	const transactionsByAccount = _.groupBy(allTransactions, 'accountId');
	const histories = await historyDB.listHistories();
	const exchangeRate = await getExchangeRate();

	const { netWorth, cashNetWorth, investmentsNetWorth, loanNetWorth, assetNetWorth, movableAsset } =
		await getNetWorth(allAccounts, allTransactions, transactionsByAccount, allInvestments, histories, today, exchangeRate);

	const oldDoc = await reportDB.getReport('netWorthDaily').catch(() => null);
	const existingData = (oldDoc && oldDoc.data) ? oldDoc.data : [];

	const cutoff = moment().subtract(DAILY_RETENTION_DAYS, 'days').format('YYYY-MM-DD');
	const filtered = existingData.filter(i => i.date >= cutoff && i.date !== today);
	filtered.push({ date: today, netWorth, cashNetWorth, investmentsNetWorth, loanNetWorth, assetNetWorth, movableAsset, exchangeRate });
	filtered.sort((a, b) => a.date.localeCompare(b.date));

	const doc = { _id: 'netWorthDaily', date: new Date(), data: filtered };
	if (oldDoc) {
		doc._rev = oldDoc._rev;
	}

	await reportDB.insertReport(doc);
	console.log('updateNetWorthDaily done');
};

module.exports = {
	updateLifeTimePlanner,
	getLifetimeFlowList,
	getNetWorth,
	updateNetWorth,
	updateNetWorthDaily
};