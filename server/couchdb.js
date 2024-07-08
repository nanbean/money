const config = require('./config');
const nano = require('nano')(`https://${config.couchDBAdminId}:${config.couchDBAdminPassword}@${config.couchDBUrl}`);
const Spooky = require('spooky');
const CronJob = require('cron').CronJob;
const moment = require('moment-timezone');
const _ = require('lodash');
const exec = require('child_process').exec;
const ping = require('ping');

const messaging = require('./messaging');
const calendar = require('./calendar');

const spreadSheet = require('./spreadSheet');

const couchdbUtil = require('./couchdbUtil');

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
					investments[investmentIdx].amount -= transaction.amount;
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
			return i.price * i.quantity
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
	console.log('updateAccountList start', new Date());
	const accountsDB = nano.use('accounts_nanbean');
	const transactionsDB = nano.use('transactions_nanbean');
	const stocksDB = nano.use('stocks');

	try {
		const accountsResponse = await accountsDB.list({ include_docs: true });
		const allAccounts = accountsResponse.rows.map(i => i.doc);
		const transactionsResponse = await transactionsDB.list({ include_docs: true });
		const allTransactions = transactionsResponse.rows.map(i => i.doc);
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
};

const arrangeInvestmemt = async () => {
	return new Promise(function (resolve, reject) {
		const stocksDB = nano.use('stocks');

		console.log('couchdb arrangeInvestmemt start', new Date());

		var spooky = new Spooky({
			child: {
				transport: 'http'
			},
			casper: {
				logLevel: 'debug',
				verbose: true,
				viewportSize: { width: 1600, height: 1200 }
			}
		}, function (err) {
			if (err) {
				const e = new Error('Failed to initialize SpookyJS');
				e.details = err;
				throw e;
			}

			spooky.start('http://finance.daum.net/domestic/all_stocks?market=KOSPI');

			spooky.wait(2500, function () { });

			spooky.then(function () {
				this.click('#orderStock');
			});

			spooky.wait(10000, function () { });

			spooky.then(function () {
				var investment1 = this.evaluate(function () {
					return [].map.call(__utils__.findAll('#boxList > div > div:nth-child(2) > div > table > tbody > tr > td:nth-child(1) > a'), function (e) {
						return e.innerHTML.replace('&amp;', '&');
					});
				});
				var investment2 = this.evaluate(function () {
					return [].map.call(__utils__.findAll('#boxList > div > div:nth-child(2) > div > table > tbody > tr > td:nth-child(4) > a'), function (e) {
						return e.innerHTML.replace('&amp;', '&');
					});
				});
				var symbol1 = this.evaluate(function () {
					return [].map.call(__utils__.findAll('#boxList > div > div:nth-child(2) > div > table > tbody > tr > td:nth-child(1) > a'), function (e) {
						return e.href.substr(e.href.length - 6, 6);
					});
				});
				var symbol2 = this.evaluate(function () {
					return [].map.call(__utils__.findAll('#boxList > div > div:nth-child(2) > div > table > tbody > tr > td:nth-child(4) > a'), function (e) {
						return e.href.substr(e.href.length - 6, 6);
					});
				});
				var price1 = this.evaluate(function () {
					return [].map.call(__utils__.findAll('#boxList > div > div:nth-child(2) > div > table > tbody > tr > td:nth-child(2) span'), function (e) {
						return e.innerHTML;
					});
				});
				var price2 = this.evaluate(function () {
					return [].map.call(__utils__.findAll('#boxList > div > div:nth-child(2) > div > table > tbody > tr > td:nth-child(5) span'), function (e) {
						return e.innerHTML;
					});
				});
				this.emit('kospiParsed', investment1.concat(investment2), symbol1.concat(symbol2), price1.concat(price2));
			});

			spooky.thenOpen('http://finance.daum.net/domestic/all_stocks?market=KOSDAQ');

			spooky.wait(2500, function () { });

			spooky.then(function () {
				this.click('#orderStock');
			});

			spooky.wait(10000, function () { });

			spooky.then(function () {
				var investment1 = this.evaluate(function () {
					return [].map.call(__utils__.findAll('#boxList > div > div:nth-child(2) > div > table > tbody > tr > td:nth-child(1) > a'), function (e) {
						return e.innerHTML.replace('&amp;', '&');
					});
				});
				var investment2 = this.evaluate(function () {
					return [].map.call(__utils__.findAll('#boxList > div > div:nth-child(2) > div > table > tbody > tr > td:nth-child(4) > a'), function (e) {
						return e.innerHTML.replace('&amp;', '&');
					});
				});
				var symbol1 = this.evaluate(function () {
					return [].map.call(__utils__.findAll('#boxList > div > div:nth-child(2) > div > table > tbody > tr > td:nth-child(1) > a'), function (e) {
						return e.href.substr(e.href.length - 6, 6);
					});
				});
				var symbol2 = this.evaluate(function () {
					return [].map.call(__utils__.findAll('#boxList > div > div:nth-child(2) > div > table > tbody > tr > td:nth-child(4) > a'), function (e) {
						return e.href.substr(e.href.length - 6, 6);
					});
				});
				var price1 = this.evaluate(function () {
					return [].map.call(__utils__.findAll('#boxList > div > div:nth-child(2) > div > table > tbody > tr > td:nth-child(2) span'), function (e) {
						return e.innerHTML;
					});
				});
				var price2 = this.evaluate(function () {
					return [].map.call(__utils__.findAll('#boxList > div > div:nth-child(2) > div > table > tbody > tr > td:nth-child(5) span'), function (e) {
						return e.innerHTML;
					});
				});
				this.emit('kodaqParsed', investment1.concat(investment2), symbol1.concat(symbol2), price1.concat(price2));
			});

			spooky.run();
		});

		spooky.on('kospiParsed', async (investments, symbol, price) => {
			console.log('couchdb arrangeInvestmemt kospiParsed', new Date());
			try {
				const oldKospi = await stocksDB.get('kospi', { revs_info: true });

				const transaction = {
					_id: 'kospi',
					_rev: oldKospi._rev,
					data: investments.map((i, index) => ({
						_id: `investment:${symbol[index]}`,
						name: i,
						googleSymbol: `KRX:${symbol[index]}`,
						yahooSymbol: `${symbol[index]}.KS`,
						price: parseFloat(price[index].replace(/,/g, ''))
					}))
				};
				await stocksDB.insert(transaction);
			} catch (err) {
				console.log(err);
			}
			console.log('couchdb arrangeInvestmemt kospiParsed done', new Date());
		});

		spooky.on('kodaqParsed', async (investments, symbol, price) => {
			console.log('couchdb arrangeInvestmemt kodaqParsed', new Date());
			try {
				const oldKosdaq = await stocksDB.get('kosdaq', { revs_info: true });

				const transaction = {
					_id: 'kosdaq',
					_rev: oldKosdaq._rev,
					data: investments.map((i, index) => ({
						_id: `investment:${symbol[index]}`,
						name: i,
						googleSymbol: `KOSDAQ:${symbol[index]}`,
						yahooSymbol: `${symbol[index]}.KQ`,
						price: parseFloat(price[index].replace(/,/g, ''))
					}))
				};

				await stocksDB.insert(transaction);
			} catch (err) {
				console.log(err);
			}

			console.log('couchdb arrangeInvestmemt done', new Date());

			resolve('done');
		});

		// for debug
		// spooky.on('console', function (line) {
		//  	console.log(line);
		// });
	});
};

exports.updateInvestmentPrice = async () => {
	// await arrangeInvestmemt();
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
	const notifications = await notificationsDB.list({include_docs: true});
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

const sendBalanceUpdateNotification = async () => {
	const allAccounts = await getAllAccounts();
	const exchangeRate = await getExchangeRate();
	const balance = allAccounts.filter(i => !i.name.match(/_Cash/i)).map(i => i.currency === 'USD' ? i.balance * exchangeRate : i.balance).reduce((prev, curr) => prev + curr);
	const netWorth = parseInt(balance, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	messaging.sendNotification('NetWorth Update', `Today's NetWorth is ${netWorth}`);
};

const updateLifeTimePlanner = async () => {
	console.log('updateLifeTimePlanner start', new Date());
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
};

exports.getLifetimeFlowList = async () => {
	const reportsDB = nano.use('reports_nanbean');
	const lifeTimePlanner = await reportsDB.get('lifetimeplanner', { revs_info: true });
	return lifeTimePlanner.data;
};

const getNetWorth = async (allAccounts, allTransactions, allInvestments, histories, date) => {
	const dateAccounts = {};
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
				netInvestments = [...netInvestments, ...investments];
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
	console.log('updateNetWorth start', new Date());
	let dates = [];
	const date = new Date();
	const currentYear = date.getFullYear();
	const currentMonth = date.getMonth() + 1;

	for (let i = 2005; i <= currentYear; i++) {
		for (let j = 1; j <= (i === currentYear ? currentMonth : 12); j++) {
			if (j == 1 || j == 3 || j == 5 || j == 7 || j == 8 || j == 10 || j == 12) {
				dates.push(`${i}-${_.padStart(j, 2, '0')}-31`);
			} else if (j == 2) {
				if (((i % 4 == 0) && (i % 100 != 0)) || (i % 400 == 0)) {
					dates.push(`${i}-${_.padStart(j, 2, '0')}-29`);
				} else {
					dates.push(`${i}-${_.padStart(j, 2, '0')}-28`);
				}
			} else {
				dates.push(`${i}-${_.padStart(j, 2, '0')}-30`);
			}
		}
	}

	const data = dates.map(i => ({date: i}));

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
		const {netWorth, cashNetWorth, investmentsNetWorth, loanNetWorth, assetNetWorth, netInvestments, movableAsset} = await getNetWorth(allAccounts, allTransactions, allInvestments, histories, item.date);
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

new CronJob('00 33 05 1 * *', async () => {
	/*
		 * update historical automation.
		 * Runs every 1st day of month, and write last day of previous month price
		 * at 03:00:00 AM.
		 */
	console.log('couchdb 00 33 05 monthly monthlyUpdateHistoricaljob started');
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
			if (!accumulator.find(i => i.date == currentValue.date && i.close == currentValue.close)) {
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
}, () => {
	/* This function is executed when the job stops */
	console.log('00 33 05 monthly monthlyUpdateHistoricaljob ended');
}, true, 'Asia/Seoul');

new CronJob('00 00 03 * * 0', () => {
	/*
		 * investment update automation.
		 * Runs week day (Monday through Friday)
		 * at 05:00:00 AM.
		 */
	console.log('couchdb 00 00 03 weekly weeklyBackupjob started');

	const backupDir = `/home/nanbean/backup/money/backup_${moment().format('YYYYMMDD')}_couch`;

	exec(`mkdir ${backupDir}`, { cwd: __dirname });
	exec(`echo ${config.sudoPassword} | cp '/opt/couchdb/data/*.couch ${backupDir}/`, { cwd: __dirname });
}, () => {
	/* This function is executed when the job stops */
	console.log('00 00 03 weekly weeklyBackupjob ended');
}, true, 'Asia/Seoul');

new CronJob('00 45 15 * * 1-5', async () => {
	/*
		 * investment update automation.
		 * Runs week day (Monday through Friday)
		 * at 05:00:00 AM.
		 */
	console.log('couchdb 00 45 15 daily dailyArrangeInvestmemtjob started');
	if (!calendar.isHoliday()) {
		await updateAccountList();
		await sendBalanceUpdateNotification();
		await updateLifeTimePlanner();
		await updateNetWorth();
	} else {
		console.log('holiday, dailyArrangeInvestmemtjob skip');
	}
}, () => {
	/* This function is executed when the job stops */
	console.log('00 45 15 daily dailyArrangeInvestmemtjob ended');
}, true, 'Asia/Seoul');

new CronJob('00 10 13 * * 1-5', async () => {
	/*
		 * investment update automation.
		 * Runs week day (Monday through Friday)
		 * at 05:00:00 AM.
		 */
	console.log('couchdb 00 10 13 daily dailyArrangeInvestmemtjob started');
	if (!calendar.isHoliday()) {
		await updateAccountList();
		await sendBalanceUpdateNotification();
		await updateLifeTimePlanner();
		await updateNetWorth();
	} else {
		console.log('holiday, dailyArrangeInvestmemtjob skip');
	}
}, () => {
	/* This function is executed when the job stops */
	console.log('00 10 13 daily dailyArrangeInvestmemtjob ended');
}, true, 'America/Los_Angeles');

var weeklyBackupjob = new CronJob('00 00 03 * * 0', () => {
	/*
		 * investment update automation.
		 * Runs week day (Monday through Friday)
		 * at 05:00:00 AM.
		 */
	console.log('00 00 03 weekly weeklyBackupjob started');

	const backupDir = `/home/nanbean/backup/money/backup_${moment().format('YYYYMMDD')}`;

	exec(`mkdir ${backupDir}`, { cwd: __dirname });
	exec(`echo ${config.sudoPassword} | sudo -S cp -r /var/lib/couchdb ${backupDir}/`, { cwd: __dirname });
}, () => {
	/* This function is executed when the job stops */
	console.log('00 00 03 weekly weeklyBackupjob ended');
},
true, /* Start the job right now */
'Asia/Seoul' /* Time zone of this job. */
);

new CronJob('00 00 * * * *', async () => {
	/*
		 * server alive check
		 * Runs week day (Monday through Friday)
		 * at 05:00:00 AM.
		 */
	ping.sys.probe('rdp.nanbean.net', function(isAlive) {
		if (!isAlive) {
			console.log(`rdp.nanbean.net server is dead`);
			messaging.sendNotification('Check server', 'ping error');
		}
	});

}, () => {
	/* This function is executed when the job stops */
	console.log(' 00 00 hourly servercheck ended');
}, true, 'Asia/Seoul');