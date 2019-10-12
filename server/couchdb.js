const config = require('./config');
const nano = require('nano')(`http://${config.couchDBAdminId}:${config.couchDBAdminPassword}@${config.couchDBUrl}`);
const Spooky = require('spooky');
const CronJob = require('cron').CronJob;
const moment = require('moment');

const messaging = require('./messaging');

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
					investments[investmentIdx].gain -= transaction.commission ? transaction.commission:0;
					investments[investmentIdx].amount += (transaction.amount );
				} else {
					investments.push({
						name: transaction.investment,
						quantity: transaction.quantity,
						price: transaction.price,
						amount: transaction.amount,
						gain: transaction.commission ? -transaction.commission:0
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
							gain: transaction.commission ? -transaction.commission:0
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

const getInvestmentBalance = (investments) => {
	let balance = 0;
	if (investments.length > 0) {
		balance = investments.map((i) => i.price * i.quantity).reduce( (prev, curr) => prev + curr );
	}

	return balance;
};

const getBalance = (name, allTransactions, transactions) => {
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
		const investmemtTransaction = allTransactions.filter(i => i.accountId === accountId);

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
	const investmentsDB = nano.use('investments_nanbean');

	try {
		const accountsResponse = await accountsDB.list({ include_docs: true });
		const allAccounts = accountsResponse.rows.map(i => i.doc);
		const transactionsResponse = await transactionsDB.list({ include_docs: true });
		const allTransactions = transactionsResponse.rows.map(i => i.doc);
		const investmentsResponse = await investmentsDB.list({ include_docs: true });
		const allInvestments = investmentsResponse.rows.map(i => i.doc);

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
		const investmentsDB = nano.use('investments_nanbean');

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

			spooky.wait(1500, function () {});

			spooky.then(function () {
				this.click('#orderStock');
			});

			spooky.wait(4000, function () {});

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

			spooky.wait(1500, function () {});

			spooky.then(function () {
				this.click('#orderStock');
			});

			spooky.wait(4000, function () {});

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
				const investmentsResponse = await investmentsDB.list({ include_docs: true });
				const oldInvestments = investmentsResponse.rows.map(i => i.doc);

				await investmentsDB.bulk({
					docs: investments.map((i, index) => {
						const oldInvestment = oldInvestments.find(i => i._id === `investment:${symbol[index]}`);
						const ret = {
							_id: `investment:${symbol[index]}`,
							name: i,
							googleSymbol: `KRX:${symbol[index]}`,
							yahooSymbol : `${symbol[index]}.KS`,
							price: parseFloat(price[index].replace(/,/g, ''))
						};
						if (oldInvestment && oldInvestment._rev) {
							ret._rev = oldInvestment._rev;
						}
						return ret;
					})
				});
			} catch (err) {
				console.log(err);
			}
			console.log('couchdb arrangeInvestmemt kospiParsed done', new Date());
		});

		spooky.on('kodaqParsed', async (investments, symbol, price) => {
			console.log('couchdb arrangeInvestmemt kodaqParsed', new Date());
			try {
				const investmentsResponse = await investmentsDB.list({ include_docs: true });
				const oldInvestments = investmentsResponse.rows.map(i => i.doc);

				await investmentsDB.bulk({
					docs: investments.map((i, index) => {
						const oldInvestment = oldInvestments.find(i => i._id === `investment:${symbol[index]}`);
						const ret = {
							_id: `investment:${symbol[index]}`,
							name: i,
							googleSymbol: `KOSDAQ:${symbol[index]}`,
							yahooSymbol : `${symbol[index]}.KQ`,
							price: parseFloat(price[index].replace(/,/g, ''))
						};
						if (oldInvestment && oldInvestment._rev) {
							ret._rev = oldInvestment._rev;
						}
						return ret;
					})
				});
			} catch (err) {
				console.log(err);
			}

			console.log('couchdb arrangeInvestmemt done', new Date());
      
			resolve('done');
		});

		// for debug
		// spooky.on('console', function (line) {
		// 	console.log(line);
		// });
	});
};

exports.updateInvestmentPrice = async () => {
	await arrangeInvestmemt();
	await updateAccountList();
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

const sendBalanceUpdateNotification = async () => {
	const allAccounts = await getAllAccounts();
	const balance = allAccounts.filter(i => !i.name.match(/_Cash/i)).map((i) => i.balance).reduce( (prev, curr) => prev + curr );
	const netWorth = parseInt(balance, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	messaging.sendNotification('NetWorth Update', `Today's NetWorth is ${netWorth}`);
};

new CronJob('00 33 05 1 * *', async () => {
	/*
		 * update historical automation.
		 * Runs every 1st day of month, and write last day of previous month price
		 * at 03:00:00 AM.
		 */
	console.log('couchdb 00 34 05 monthly monthlyUpdateHistoricaljob started');
	const historiesDB = nano.use('histories_nanbean');
	const investmentsDB = nano.use('investments_nanbean');
	const investmentsResponse = await investmentsDB.list({ include_docs: true });
	const investments = investmentsResponse.rows.map(i => i.doc);
	const historiesResponse = await historiesDB.list({ include_docs: true });
	const oldHistories = historiesResponse.rows.map(i => i.doc);
	const newHistories = oldHistories.map(i => ({
		...i,
		data: [
			{
				date: `${moment().subtract(1, 'days').format('YYYY-MM-DD')}T18:00:00.000Z`,
				close: investments.find(j => j._id === i._id.replace('history', 'investment')) && investments.find(j => j._id === i._id.replace('history', 'investment')).price
			},
			...i.data
		]
	}));
	await historiesDB.bulk({
		docs: newHistories
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

new CronJob('00 40 15 * * 1-5', async () => {
	/*
		 * investment update automation.
		 * Runs week day (Monday through Friday)
		 * at 05:00:00 AM.
		 */
	console.log('couchdb 00 40 15 daily dailyArrangeInvestmemtjob started');

	await arrangeInvestmemt();
	await updateAccountList();
	await sendBalanceUpdateNotification();
}, () => {
	/* This function is executed when the job stops */
	console.log('00 40 15 daily dailyArrangeInvestmemtjob ended');
}, true, 'Asia/Seoul');