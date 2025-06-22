const moment = require('moment-timezone');
const _ = require('lodash');
const { reportsDB, accountsDB, transactionsDB, stocksDB, historiesDB } = require('../db');
const spreadSheet = require('../spreadSheet');
const { getInvestmentList, getInvestmentBalance } = require('../utils/investment');
const { getBalance } = require('../utils/account');
const { getExchangeRate } = require('./settingService');
const { getAllAccounts } = require('./accountService');

const updateLifeTimePlanner = async () => {
	console.time('updateLifeTimePlanner');
	console.log('updateLifeTimePlanner start', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));
	let oldLifeTimePlanner;

	try {
		oldLifeTimePlanner = await reportsDB.get('lifetimeplanner', { revs_info: true });
	} catch (err) {
		console.log(err);
	}

	const accounts = await getAllAccounts();
	const data = await spreadSheet.getLifetimeFlowList(accounts);
	const transaction = {
		_id: 'lifetimeplanner',
		date: new Date(),
		data
	};

	if (oldLifeTimePlanner) {
		transaction._rev = oldLifeTimePlanner._rev;
	}

	await reportsDB.insert(transaction);

	console.log('updateLifeTimePlanner done');
	console.timeEnd('updateLifeTimePlanner');
};

const getLifetimeFlowList = async () => {
	const lifeTimePlanner = await reportsDB.get('lifetimeplanner', { revs_info: true });
	return lifeTimePlanner.data;
};

const getNetWorth = async (allAccounts, allTransactions, transactionsByAccount, allInvestments, histories, date) => {
	let cashNetWorth = 0;
	let investmentsNetWorth = 0;
	let loanNetWorth = 0;
	let netInvestments = [];
	let assetNetWorth = 0;
	const exchangeRate = await getExchangeRate();

	for (const account of allAccounts) {
		const accountTransactions = transactionsByAccount[`account:${account.type}:${account.name}`] || [];
		const transactions = accountTransactions.filter(i => i.date <= date);
		if (transactions.length > 0) {
			if (account.type === 'Invst') {
				const investments = getInvestmentList(allInvestments, allTransactions, transactions);
				const balance = getInvestmentBalance(investments, date, histories);
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
	}
	
	return {
		netWorth: cashNetWorth + investmentsNetWorth + loanNetWorth + assetNetWorth,
		cashNetWorth,
		investmentsNetWorth,
		loanNetWorth,
		assetNetWorth,
		netInvestments,
		movableAsset: cashNetWorth + investmentsNetWorth + loanNetWorth
	};
};

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

	const data = dates.map(i => ({ date: i }));

	const accountsResponse = await accountsDB.list({ include_docs: true });
	const allAccounts = accountsResponse.rows.map(i => i.doc);
	const transactionsResponse = await transactionsDB.list({ include_docs: true });
	const allTransactions = transactionsResponse.rows.map(i => i.doc);
	const kospiResponse = await stocksDB.get('kospi');
	const kosdaqResponse = await stocksDB.get('kosdaq');
	const usResponse = await stocksDB.get('us');
	const allInvestments = [...kospiResponse.data, ...kosdaqResponse.data, ...usResponse.data];
	const transactionsByAccount = _.groupBy(allTransactions, 'accountId');
	const historiesResponse = await historiesDB.list({ include_docs: true });
	const histories = historiesResponse.rows.map(i => i.doc);
	const oldNetWorth = await reportsDB.get('netWorth', { revs_info: true }).catch(() => null);

	for (const item of data) {
		const { netWorth, cashNetWorth, investmentsNetWorth, loanNetWorth, assetNetWorth, netInvestments, movableAsset } = await getNetWorth(allAccounts, allTransactions, transactionsByAccount, allInvestments, histories, item.date);
		item.netWorth = netWorth;
		item.cashNetWorth = cashNetWorth;
		item.investmentsNetWorth = investmentsNetWorth;
		item.loanNetWorth = loanNetWorth;
		item.assetNetWorth = assetNetWorth;
		item.netInvestments = netInvestments;
		item.assetNetWorth = assetNetWorth;
		item.movableAsset = movableAsset;
	}
	
	const netWorth = {
		_id: 'netWorth',
		date: new Date(),
		data
	};

	if (oldNetWorth) {
		netWorth._rev = oldNetWorth._rev;
	}

	await reportsDB.insert(netWorth);

	console.log('updateNetWorth done');
	console.timeEnd('updateNetWorth');
};

module.exports = {
	updateLifeTimePlanner,
	getLifetimeFlowList,
	getNetWorth,
	updateNetWorth
};