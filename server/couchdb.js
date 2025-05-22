const config = require('./config');
const nano = require('nano')(`https://${config.couchDBAdminId}:${config.couchDBAdminPassword}@${config.couchDBUrl}`);
const CronJob = require('cron').CronJob;
const moment = require('moment-timezone');
const _ = require('lodash');

const messaging = require('./messaging');
const calendar = require('./calendar');

const spreadSheet = require('./spreadSheet');

const pouchdb = require('./pouchdb');
const couchdbUtil = require('./couchdbUtil');

const { getKisToken, getKisQuoteKorea, getKisQuoteUS, getKisExchangeRate } = require('./kisConnector');

const getInvestmentList = (allInvestments, allTransactions, transactions) => {
	const investments = [];
	for (let i = 0; i < transactions.length; i++) {
		const transaction = transactions[i];
		if (transaction) {
			const activity = transaction.activity;
			const investmentIdx = investments.findIndex((item) => item.name === transaction.investment);
			if (activity === 'Buy') {
				if (investmentIdx >= 0) {
					investments[investmentIdx].price = (investments[investmentIdx].price * investments[investmentIdx].quantity + transaction.price * transaction.quantity) / (investments[investmentIdx].quantity + transaction.quantity);
					investments[investmentIdx].quantity += transaction.quantity;
					investments[investmentIdx].gain -= transaction.commission ? transaction.commission : 0;
					investments[investmentIdx].amount += (transaction.amount);
				} else {
					investments.push({
						name: transaction.investment,
						quantity: transaction.quantity,
						price: transaction.price,
						amount: transaction.amount,
						gain: transaction.commission ? -transaction.commission : 0
					});
				}
			} else if (transaction.activity === 'Sell') {
				if (investmentIdx >= 0) {
					investments[investmentIdx].gain -= transaction.commission ? transaction.commission : 0;
					investments[investmentIdx].gain -= parseInt(investments[investmentIdx].price * investments[investmentIdx].quantity - transaction.price * transaction.quantity, 10);
					investments[investmentIdx].quantity -= transaction.quantity;
					investments[investmentIdx].amount -= transaction.amount;

					if (investments[investmentIdx].quantity === 0) {
						investments[investmentIdx].amount = 0;
					}
				} else {
					console.log('error');
				}
			} else if (activity === 'ShrsIn') {
				try {
					const shrsOutTransactionFind = allTransactions.find(i => i.activity === 'ShrsOut' && i.investment === transaction.investment && i.date === transaction.date);
					const shrsOutTransactionPrice = shrsOutTransactionFind && shrsOutTransactionFind.price;

					if (investmentIdx >= 0) {
						investments[investmentIdx].price = (investments[investmentIdx].price * investments[investmentIdx].quantity + shrsOutTransactionPrice * transaction.quantity) / (investments[investmentIdx].quantity + transaction.quantity);
						investments[investmentIdx].quantity += transaction.quantity;
					} else {
						investments.push({
							name: transaction.investment,
							quantity: transaction.quantity,
							price: shrsOutTransactionPrice,
							amount: transaction.amount,
							gain: transaction.commission ? -transaction.commission : 0
						});
					}
				} catch (err) {
					console.log(err);
				}
			} else if (activity === 'ShrsOut') {
				if (investmentIdx >= 0) {
					investments[investmentIdx].quantity -= transaction.quantity;
					if (investments[investmentIdx].quantity === 0) {
						investments[investmentIdx].amount = 0;
					} else {
						investments[investmentIdx].amount -= (transaction.price * transaction.quantity);
					}
				} else {
					console.log('error');
				}
			}
		}
	}

	return investments.map(i => {
		const investment = allInvestments.find(j => j.name === i.name);

		if (investment) {
			// update current price
			return {
				...i,
				purchasedPrice: i.price,
				purchasedValue: i.price * i.quantity,
				appraisedValue: investment.price * i.quantity,
				price: investment.price
			};
		} else {
			return {
				...i,
				purchasedPrice: i.price,
				purchasedValue: i.price * i.quantity,
				appraisedValue: i.price * i.quantity
			};
		}
	});
};

const getInvestmentBalance = (investments, date, histories) => {
	const currentYearMonth = moment().format('YYYY-MM');
	let balance = 0;
	if (investments.length > 0) {
		balance = investments.map(i => {
			if (date && histories) {
				if (i.quantity > 0) {
					const dateYearMonth = date.substr(0,7);
					const investment = investments.find(j => j.name === i.name);
					const history = histories.find(j => j.name === i.name);
					const historical = history && history.data.filter(k => {
						return k.date.substr(0,7) === dateYearMonth;
					});
					const historicalPrice = historical && historical.length > 0 && historical[historical.length - 1].close;
					if (currentYearMonth === dateYearMonth) {
						return investment.price * i.quantity;
					}
					if (historicalPrice) {
						return historicalPrice * i.quantity;
					}
				}
			}
			return i.price * i.quantity;
		})
			.reduce((prev, curr) => prev + curr);
	}

	return balance;
};

const getBalance = (name, allTransactions, transactions, date) => {
	let balance = 0;
	for (let i = 0; i < transactions.length; i++) {
		const transaction = transactions[i];
		if (transaction) {
			balance += transaction.amount;
		}
	}

	// We have to subtract ivestment in investment cash account
	if (name.match(/_Cash/i)) {
		const accountId = `account:Invst:${name.split('_')[0]}`;
		const investmemtTransaction = date ? allTransactions.filter(i => i.accountId === accountId && i.date <= date) : allTransactions.filter(i => i.accountId === accountId);

		for (let i = 0; i < investmemtTransaction.length; i++) {
			const transaction = investmemtTransaction[i];
			if (transaction.activity === 'Buy' || transaction.activity === 'MiscExp') {
				balance -= transaction.amount;
			} else if (transaction.activity === 'Sell' || transaction.activity === 'Div') {
				balance += transaction.amount;
			}
		}
	}

	return balance;
};

const updateAccountList = async () => {
	console.time('updateAccountList');
	console.log('updateAccountList start', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));
	const accountsDB = nano.use('accounts_nanbean');
	const stocksDB = nano.use('stocks');

	try {
		const accountsResponse = await accountsDB.list({ include_docs: true });
		const allAccounts = accountsResponse.rows.map(i => i.doc);
		const allTransactions = await pouchdb.getAllTransactions();
		const kospiResponse = await stocksDB.get('kospi');
		const kosdaqResponse = await stocksDB.get('kosdaq');
		const usResponse = await stocksDB.get('us');
		const allInvestments = [...kospiResponse.data, ...kosdaqResponse.data, ...usResponse.data];

		for (let i = 0; i < allAccounts.length; i++) {
			const account = allAccounts[i];
			const type = account.type;
			const name = account.name;

			let balance = 0;
			let investments = [];

			if (type === 'Invst') {
				investments = getInvestmentList(allInvestments, allTransactions, allTransactions.filter(i => i.accountId === `account:${type}:${name}`));
				balance = getInvestmentBalance(investments);
				const cashBalance = getBalance(account.cashAccountId.split(':')[2], allTransactions, allTransactions.filter(i => i.accountId === account.cashAccountId));
				account.cashBalance = cashBalance;
				balance += cashBalance;
			} else {
				balance = getBalance(name, allTransactions, allTransactions.filter(i => i.accountId === `account:${type}:${name}`));
			}
			allAccounts[i].investments = investments;
			allAccounts[i].balance = balance;
		}
		await accountsDB.bulk({ docs: allAccounts });
	} catch (err) {
		console.log(err);
	}
	console.log('updateAccountList done');
	console.timeEnd('updateAccountList');
};

exports.updateInvestmentPrice = async () => {
	await arrangeExchangeRate();
	await arrangeKRInvestmemt();
	await arrangeUSInvestmemt();
	await updateAccountList();
	await updateLifeTimePlanner();
	// await updateNetWorth();
};

const getAllAccounts = async () => {
	const accountsDB = nano.use('accounts_nanbean');
	const accountsResponse = await accountsDB.list({ include_docs: true });
	const allAccounts = accountsResponse.rows.map(i => i.doc);

	return allAccounts;
};

exports.getAccounts = async () => {
	return await getAllAccounts();
};

const getAllTransactions = async () => {
	const transactionsDB = nano.use('transactions_nanbean');
	const allTransactions = await transactionsDB.list({ include_docs: true });
	const transactions = allTransactions.rows.map(i => i.doc);

	return transactions;
};

exports.getTransactions = async () => {
	return await getAllTransactions();
};

exports.addTransaction = async (transaction) => {
	const transactionsDB = nano.use('transactions_nanbean');
	await transactionsDB.insert(transaction);
	await updateAccountList();
};

exports.addNotification = async (notification) => {
	const notificationsDB = nano.use('notifications_nanbean');
	await notificationsDB.insert(notification);
};

exports.listNotifications = async (size) => {
	const notificationsDB = nano.use('notifications_nanbean');
	const notifications = await notificationsDB.list({ include_docs: true });
	return notifications.rows.slice(notifications.rows.length - size, notifications.rows.length).map(i => i.doc.text);
};

const getSettings = async () => {
	const settingsDB = nano.use('settings_nanbean');
	const settingsResponse = await settingsDB.list({ include_docs: true });
	const settings = settingsResponse.rows.map(i => i.doc);

	return settings;
};

const getExchangeRate = async () => {
	const settings = await getSettings();
	const exchangeRate = settings.find(i => i._id === 'exchangeRate');

	if (exchangeRate && exchangeRate.dollorWon) {
		return exchangeRate.dollorWon;
	}

	return 1000;
};

exports.getCategoryList = async () => {
	const settings = await getSettings();
	const categoryList = settings.find(i => i._id === 'categoryList');

	if (categoryList && categoryList.data) {
		return categoryList.data;
	}

	return [];
};

const sendBalanceUpdateNotification = async () => {
	const allAccounts = await getAllAccounts();
	const exchangeRate = await getExchangeRate();
	const balance = allAccounts.filter(i => !i.name.match(/_Cash/i)).map(i => i.currency === 'USD' ? i.balance * exchangeRate : i.balance).reduce((prev, curr) => prev + curr);
	const netWorth = parseInt(balance, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	messaging.sendNotification('NetWorth Update', `Today's NetWorth is ${netWorth}`, 'graph');
};

const arrangeKRInvestmemt = async () => {
	const accountsDB = nano.use('accounts_nanbean');
	const accountsResponse = await accountsDB.list({ include_docs: true });
	const allAccounts = accountsResponse.rows.map(i => i.doc);
	const stocksDB = nano.use('stocks');
	const kospiResponse = await stocksDB.get('kospi', { revs_info: true });
	const investments = couchdbUtil.getInvestmentsFromAccounts(kospiResponse.data, allAccounts).filter(i => i.quantity > 0);
	const accessToken = await getKisToken();
	const promises = investments.map(i => getKisQuoteKorea(accessToken, i.googleSymbol));
	const results = await Promise.all(promises);

	await stocksDB.insert({
		...kospiResponse,
		date: moment().tz('Asia/Seoul').format('YYYY-MM-DD'),
		data: kospiResponse.data.map((i) => {
			const foundResult = results.find(j => j.googleSymbol === i.googleSymbol);
			const priceString = foundResult?.output?.stck_prpr;
			if (priceString) {
				return {
					...i,
					price: parseInt(priceString, 10)
				};
			} else {
				return i;
			}
		})
	});
};

exports.arrangeKRInvestmemt = arrangeKRInvestmemt;

const arrangeUSInvestmemt = async () => {
	const accountsDB = nano.use('accounts_nanbean');
	const accountsResponse = await accountsDB.list({ include_docs: true });
	const allAccounts = accountsResponse.rows.map(i => i.doc);
	const stocksDB = nano.use('stocks');
	const usResponse = await stocksDB.get('us', { revs_info: true });
	const investments  = couchdbUtil.getInvestmentsFromAccounts(usResponse.data, allAccounts).filter(i => i.quantity > 0);
	const accessToken = await getKisToken();
	const promises = investments.map(i => getKisQuoteUS(accessToken, i.googleSymbol));
	const results = await Promise.all(promises);

	await stocksDB.insert({
		...usResponse,
		date: moment().tz('America/Los_Angeles').format('YYYY-MM-DD'),
		data: usResponse.data.map((i) => {
			const foundResult = results.find(j => j.googleSymbol === i.googleSymbol);
			const priceString = foundResult?.output?.last;
			if (priceString) {
				return {
					...i,
					price: parseFloat(priceString)
				};
			} else {
				return i;
			}
		})
	});
};

const arrangeExchangeRate = async () => {
	const settingsDB = nano.use('settings_nanbean');
	const settingsResponse = await settingsDB.list({ include_docs: true });
	const settings = settingsResponse.rows.map(i => i.doc);
	const exchangeRate = settings.find(i => i._id === 'exchangeRate');
	const enableExchangeRateUpdate = settings.find(i => i._id === 'enableExchangeRateUpdate');

	if (enableExchangeRateUpdate.value) {
		const accessToken = await getKisToken();
		const kisExchangeRate = await getKisExchangeRate(accessToken);
		if (kisExchangeRate) {
			exchangeRate.dollorWon = kisExchangeRate;
			await settingsDB.insert(exchangeRate);
		}
	}
};

exports.arrangeExchangeRate = arrangeExchangeRate;

const updateLifeTimePlanner = async () => {
	console.time('updateLifeTimePlanner');
	console.log('updateLifeTimePlanner start', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));
	const reportsDB = nano.use('reports_nanbean');
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

exports.getLifetimeFlowList = async () => {
	const reportsDB = nano.use('reports_nanbean');
	const lifeTimePlanner = await reportsDB.get('lifetimeplanner', { revs_info: true });
	return lifeTimePlanner.data;
};

const getNetWorth = async (allAccounts, allTransactions, allInvestments, histories, date) => {
	let cashNetWorth = 0;
	let investmentsNetWorth = 0;
	let loanNetWorth = 0;
	let netInvestments = [];
	let assetNetWorth = 0;
	const exchangeRate = await getExchangeRate();

	for (const account of allAccounts) {
		const transactions = allTransactions.filter(i => i.date <= date).filter(i => i.accountId === `account:${account.type}:${account.name}`);
		if (transactions.length > 0) {
			if (account.type === 'Invst') {
				const investments = getInvestmentList(allInvestments, allTransactions, transactions);
				const balance = getInvestmentBalance(investments, date, histories);
				netInvestments = [...netInvestments, ...investments].filter(i => i.quantity > 0);
				investmentsNetWorth += account.currency === 'USD' ? balance * exchangeRate:balance;
			} else if (account.type === 'Oth A') {
				const balance = getBalance(account.name, allTransactions, transactions, date);
				assetNetWorth += account.currency === 'USD' ? balance * exchangeRate:balance;
			} else if (account.type === 'Oth L') {
				const balance = getBalance(account.name, allTransactions, transactions, date);
				loanNetWorth += account.currency === 'USD' ? balance * exchangeRate:balance;
			} else if (account.name.match(/_Cash/)) {
				const balance = getBalance(account.name, allTransactions, transactions, date);
				investmentsNetWorth += account.currency === 'USD' ? balance * exchangeRate:balance;
			} else {
				const balance = getBalance(account.name, allTransactions, transactions, date);
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

	const accountsDB = nano.use('accounts_nanbean');
	const accountsResponse = await accountsDB.list({ include_docs: true });
	const allAccounts = accountsResponse.rows.map(i => i.doc);
	const transactionsDB = nano.use('transactions_nanbean');
	const transactionsResponse = await transactionsDB.list({ include_docs: true });
	const allTransactions = transactionsResponse.rows.map(i => i.doc);
	const stocksDB = nano.use('stocks');
	const kospiResponse = await stocksDB.get('kospi');
	const kosdaqResponse = await stocksDB.get('kosdaq');
	const usResponse = await stocksDB.get('us');
	const allInvestments = [...kospiResponse.data, ...kosdaqResponse.data, ...usResponse.data];
	const historiesDB = nano.use('histories_nanbean');
	const historiesResponse = await historiesDB.list({ include_docs: true });
	const histories = historiesResponse.rows.map(i => i.doc);
	const reportsDB = nano.use('reports_nanbean');
	const oldNetWorth = await reportsDB.get('netWorth', { revs_info: true });

	for (const item of data) {
		const { netWorth, cashNetWorth, investmentsNetWorth, loanNetWorth, assetNetWorth, netInvestments, movableAsset } = await getNetWorth(allAccounts, allTransactions, allInvestments, histories, item.date);
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
};

const arrangeHistorical = async () => {
	console.log('arrangeHistorical start', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));
	const transactionsDB = nano.use('transactions_nanbean');
	const transactionsResponse = await transactionsDB.list({ include_docs: true });
	const allTransactions = transactionsResponse.rows.map(i => i.doc);
	const historiesDB = nano.use('histories_nanbean');
	const stocksDB = nano.use('stocks');
	const kospiResponse = await stocksDB.get('kospi');
	const kosdaqResponse = await stocksDB.get('kosdaq');
	const usResponse = await stocksDB.get('us');
	const investments = [...kospiResponse.data, ...kosdaqResponse.data, ...usResponse.data];
	const historiesResponse = await historiesDB.list({ include_docs: true });
	const oldHistories = historiesResponse.rows.map(i => i.doc);
	const newHistories = oldHistories.map(i => ({
		...i,
		data: [
			{
				date: `${moment().tz('Asia/Seoul').subtract(1, 'days').format('YYYY-MM-DD')}T18:00:00.000Z`,
				close: couchdbUtil.getClosePriceWithHistory(investments, i)
			},
			...i.data
		].reduce((accumulator, currentValue) => {
			if (!accumulator.find(i => i.date === currentValue.date && i.close === currentValue.close)) {
				accumulator.push(currentValue);
			}
			return accumulator;
		}, [])
	}));
	await historiesDB.bulk({
		docs: newHistories
	});
	const newInvestments = couchdbUtil.getInvestmentsFromTransactions(investments, allTransactions).filter(i => !newHistories.find(j => j.name === i.name)).map(i => ({
		...i,
		data: [
			{
				date: `${moment().tz('Asia/Seoul').subtract(1, 'days').format('YYYY-MM-DD')}T18:00:00.000Z`,
				close: couchdbUtil.getClosePriceWithHistory(investments, i)
			}
		]
	}));
	await historiesDB.bulk({
		docs: newInvestments
	});
	console.log('arrangeHistorical done', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));
};

new CronJob('00 33 05 1 * *', async () => {
	/*
		 * update historical automation.
		 * Runs every 1st day of month, and write last day of previous month price
		 * at 03:00:00 AM.
		 */
	console.log('stock 00 33 05 monthly monthlyUpdateHistoricaljob started');
	await arrangeHistorical();
}, () => {
	/* This function is executed when the job stops */
	console.log('00 33 05 monthly monthlyUpdateHistoricaljob ended');
}, true, 'Asia/Seoul');

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
