const path = require('path');
const fs = require('fs');
const util = require('util');
const async = require('async');
const Spooky = require('spooky');
const CronJob = require('cron').CronJob;
const googleFinance = require('google-finance');
const moment = require('moment');
const { exec } = require('child_process');

const qif2json = require('./qif2json');
const json2qif = require('./json2qif');
const messaging = require('./messaging');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

let money = exports;

const readFileAsync = async (filePath) => {
	return await readFile(filePath);
}

const writeFileAsync = async (filePath, data) => {
	return await writeFile(filePath, JSON.stringify(data, null, 2));
}

const updateAccountList = (name, type, balance, investments, qifData) => {
	const account = {
		name: name,
		type: type,
		balance: balance,
		investments: investments
	};
	let accountListIndex = -1;

	if (name.match(/Closed/i)) {
		// do nothing
	} else if (name.match(/_Cash/i)) { // _Cash account is sub-account of Investement
		accountListIndex = money.accountList.findIndex(i => i.name === name.substr(0, name.length  -5));
		if (accountListIndex >= 0) {
			money.accountList[accountListIndex].cashAccount = account;
			money.accountList[accountListIndex].investments.push({
				name: 'cash',
				amount: balance
			});
		}
	} else {
		accountListIndex = money.accountList.findIndex(i => i.name === name);
		if (accountListIndex >= 0) {
			money.accountList[accountListIndex] = account;
		} else {
			money.accountList.push(account);
		}
	}

	money.accounts[name] = qifData;
}

const getInvestmentList = (name, transactions) => {
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
					})
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
					console.log(transaction)
				}
			} else if (activity === 'ShrsIn') {
				const shrsInOutIdx = money.shrsInOut.findIndex((item) => item.date === transaction.date && item.shrsInOut == 'ShrsOut' && item.investment == transaction.investment);

				if (investmentIdx >= 0) {
					investments[investmentIdx].price = (investments[investmentIdx].price * investments[investmentIdx].quantity + money.shrsInOut[shrsInOutIdx].price * transaction.quantity) / (investments[investmentIdx].quantity + transaction.quantity);
					investments[investmentIdx].quantity += transaction.quantity;
				} else {
					investments.push({
						name: transaction.investment,
						quantity: transaction.quantity,
						price: money.shrsInOut[shrsInOutIdx] ? money.shrsInOut[shrsInOutIdx].price : 0,
						amount: transaction.amount,
						gain: transaction.commission ? -transaction.commission:0
					})
				}
				money.shrsInOut.push({
					account: name,
					shrsInOut: 'ShrsIn',
					date: transaction.date,
					investment: transaction.investment,
					transaction: transaction
				});
			} else if (activity === 'ShrsOut') {
				if (investmentIdx >= 0) {
					investments[investmentIdx].quantity -= transaction.quantity;
					investments[investmentIdx].amount -= transaction.amount;
				} else {
					console.log('error');
					console.log(transaction)
				}
				money.shrsInOut.push({
					account: name,
					shrsInOut: 'ShrsOut',
					date: transaction.date,
					investment: transaction.investment,
					price: investments[investmentIdx].price,
					transaction: transaction
				});
			}
		}
	}

	return investments;
}

const getBalance = (name, transactions) => {
	let balance = 0;
	for (let i = 0; i < transactions.length; i++) {
		const transaction = transactions[i];
		if (transaction) {
			const activity = transaction.activity;
			balance += transaction.amount;
		}
	}

	// We have to subtract ivestment in investment cash account
	if (name.match(/_Cash/i)) {
		const investmemtTransaction = money.accounts[name.split('_')[0]];
		if (investmemtTransaction && investmemtTransaction.transactions) {
			for (let i = 0; i < investmemtTransaction.transactions.length; i++) {
				const transaction = investmemtTransaction.transactions[i];
				if (transaction.activity === 'Buy' || transaction.activity === 'MiscExp') {
					balance -= transaction.amount;
				} else if (transaction.activity === 'Sell' || transaction.activity === 'Div') {
					balance += transaction.amount;
				}
			}
		}
	}

	return balance;
}

const getInvestmentBalance = (investments) => {
	let balance = 0;
	if (investments.length > 0) {
		balance = investments.map((i) => i.price * i.quantity).reduce( (prev, curr) => prev + curr );
	}

	return balance;
}

const parseFile = (file, callback) => {
	return new Promise(resolve => {
		const filePath = path.resolve(__dirname, file);
		const name = path.basename(filePath, '.qif');
		console.log(`parsing ${file} ...`);
		if (fs.existsSync(filePath)) {
			qif2json.parseFile(filePath, (err, qifData) => {
				const type = qifData.type;
				let balance = 0;
				let investments = [];

				if (qifData.transactions) {
					if (type === 'Invst') {
						investments = getInvestmentList(name, qifData.transactions);
						balance = getInvestmentBalance(investments);
					} else {
						balance = getBalance(name, qifData.transactions);
					}
				}
				updateAccountList(name, type, balance, investments, qifData);
				console.log(`parsing ${file} done...`);
				callback && callback();
				resolve('done');
			});
		} else {
			resolve('done');
		}
	});
}

const updateInvestmentAccount = () => {
	money.accountList
	.sort((a, b) => {
		if (a.type < b.type) {
			return -1;
		}
		if (b.type < a.type) {
			return 1;
		}
		if (a.name < b.name) {
			return -1;
		}
		if (b.name < a.name) {
			return 1;
		}
		return 0;
	});

	for (let i = 0; i < money.accountList.length; i++) {
		const account = money.accountList[i];
		if (account.type == 'Invst' && account.investments) {
			const investments = account.investments;
			let balance = 0;
			for (let j = 0; j < investments.length; j++) {
				if (investments[j].quantity > 0) {
					const findInvestment = money.investments.find(item => item.name === investments[j].name);
					balance += investments[j].quantity * (findInvestment && findInvestment.price ? findInvestment.price : investments[j].price);
				}
				if (investments[j].name === 'cash') {
					balance += investments[j].amount
				}
			}
			account.balance = balance;
		}
	}
	console.log('init done');
}

const arrangeCategory = (category) => {
	money.categories = [];
	let categories = [];
	let subcategories = [];
	for (let i in money.accounts) {
		const transactions = money.accounts[i].transactions;
		if (transactions) {
			categories = [...categories, ...transactions.filter(i => i.category).map(i => i.category)];
			subcategories = [...subcategories, ...transactions.filter(i => i.subcategory).map(i => `${i.category}:${i.subcategory}`)];
		}
	}
	categories = [...new Set(categories)];
	if (!categories.find(i => i === '분류없음')) {
		categories.push('분류없음');
	}
	subcategories = [...new Set(subcategories)];
	money.categories = [...categories, ...subcategories];
	money.categories.sort();
}

const arrangePayee = () => {
	money.payees = [];
	let payees = [];
	for (let i in money.accounts) {
		const transactions = money.accounts[i].transactions;
		if (transactions) {
			payees = [...payees, ...transactions.filter(i => i.payee).map(i => i.payee)];
		}
	}
	payees = [...new Set(payees)];
	money.payees = payees;
	money.payees.sort();
}

const arrangeInvestmemt = (resolve) => {
	const investmentList = [...new Set(money.accountList.filter(i => i.investments.length > 0).map(i => i.investments).reduce((a, b) => a.concat(b)).map(i => i.name))];
	const investments = investmentList.filter(j => j !== 'cash').map(i => { return {name: i} });
	const allinvestments = [];

	money.investments = investments;
	money.allinvestments = allinvestments;

	const filePath = path.resolve(__dirname, 'account.json')
	fs.writeFile(filePath, JSON.stringify(money.accountList, null, 2), (err, data) => {
	});

	var spooky = new Spooky({
		child: {
			transport: 'http'
		},
		casper: {
			logLevel: 'debug',
			verbose: true,
			viewportSize: {width: 1600, height: 1200}
		}
	}, function (err) {
		if (err) {
			e = new Error('Failed to initialize SpookyJS');
			e.details = err;
			throw e;
		}

		spooky.start('http://finance.daum.net/quote/all.daum?type=S&stype=P');

		spooky.then(function(){
			var investment1 = this.evaluate(function () {
				return [].map.call(__utils__.findAll('table.gTable.clr tr td:nth-child(1) a'), function (e) {
					return e.innerHTML.replace("&amp;", "&");
				});
			});
			var investment2 = this.evaluate(function () {
				return [].map.call(__utils__.findAll('table.gTable.clr tr td:nth-child(4) a'), function (e) {
					return e.innerHTML.replace("&amp;", "&");
				});
			});
			var symbol1 = this.evaluate(function () {
				return [].map.call(__utils__.findAll('table.gTable.clr tr td:nth-child(1) a'), function (e) {
					return e.href.substr(e.href.length - 6, 6);
				});
			});
			var symbol2 = this.evaluate(function () {
				return [].map.call(__utils__.findAll('table.gTable.clr tr td:nth-child(4) a'), function (e) {
					return e.href.substr(e.href.length - 6, 6);
				});
			});
			var price1 = this.evaluate(function () {
				return [].map.call(__utils__.findAll('table.gTable.clr tr td:nth-child(2) span'), function (e) {
					return e.innerHTML;
				});
			});
			var price2 = this.evaluate(function () {
				return [].map.call(__utils__.findAll('table.gTable.clr tr td:nth-child(5) span'), function (e) {
					return e.innerHTML;
				});
			});
			this.emit('kospiParsed', investment1.concat(investment2), symbol1.concat(symbol2), price1.concat(price2));
		});

		spooky.thenOpen('http://finance.daum.net/quote/all.daum?type=S&stype=Q');

		spooky.then(function(){
			var investment1 = this.evaluate(function () {
				return [].map.call(__utils__.findAll('table.gTable.clr tr td:nth-child(1) a'), function (e) {
					return e.innerHTML.replace("&amp;", "&");
				});
			});
			var investment2 = this.evaluate(function () {
				return [].map.call(__utils__.findAll('table.gTable.clr tr td:nth-child(4) a'), function (e) {
					return e.innerHTML.replace("&amp;", "&");
				});
			});
			var symbol1 = this.evaluate(function () {
				return [].map.call(__utils__.findAll('table.gTable.clr tr td:nth-child(1) a'), function (e) {
					return e.href.substr(e.href.length - 6, 6);
				});
			});
			var symbol2 = this.evaluate(function () {
				return [].map.call(__utils__.findAll('table.gTable.clr tr td:nth-child(4) a'), function (e) {
					return e.href.substr(e.href.length - 6, 6);
				});
			});
			var price1 = this.evaluate(function () {
				return [].map.call(__utils__.findAll('table.gTable.clr tr td:nth-child(2) span'), function (e) {
					return e.innerHTML;
				});
			});
			var price2 = this.evaluate(function () {
				return [].map.call(__utils__.findAll('table.gTable.clr tr td:nth-child(5) span'), function (e) {
					return e.innerHTML;
				});
			});
			this.emit('kodaqParsed', investment1.concat(investment2), symbol1.concat(symbol2), price1.concat(price2));
		});

		spooky.run();
	});

	spooky.on('kospiParsed', function (investment, symbol, price) {
		for (let i = 0; i < investments.length; i++) {
			const index = investment.findIndex(item => item === investments[i].name);
			if ( index >= 0 ) {
				investments[i].symbol = symbol[index];
				investments[i].googleSymbol = `KRX:${symbol[index]}`;
				investments[i].yahooSymbol = `${symbol[index]}.KS`;
				investments[i].price = parseFloat(price[index].replace(/,/g, ''));
			}
		}

		for (let k = 0; k < investment.length; k++) {
			allinvestments.push({
				name: investment[k],
				symbol: symbol[k],
				googleSymbol : `KRX:${symbol[k]}`,
				yahooSymbol : `${symbol[k]}.KS`,
				price: parseFloat(price[k].replace(/,/g, ''))
			});
		}
	});

	spooky.on('kodaqParsed', async (investment, symbol, price) => {
		for (let i = 0; i < investments.length; i++) {
			for (let j = 0; j < investment.length; j++) {
				if (investment[j] === investments[i].name) {
					investments[i].symbol = symbol[j];
					investments[i].googleSymbol = `KOSDAQ:${symbol[j]}`;
					investments[i].yahooSymbol = `${symbol[j]}.KQ`;
					investments[i].price = parseFloat(price[j].replace(/,/g, ''));
				}
			}
		}
		for (let k = 0; k < investment.length; k++) {
			allinvestments.push({
				name: investment[k],
				symbol: symbol[k],
				googleSymbol : `KOSDAQ:${symbol[k]}`,
				yahooSymbol : `${symbol[k]}.KQ`,
				price: parseFloat(price[k].replace(/,/g, ''))
			});
		}
		updateInvestmentAccount();
		await updateHistorical();
		if (resolve) {
			resolve(true);
		}

		console.log('arrangeInvestmemt done');
	});

	// for debug
	// spooky.on('console', function (line) {
	// 	console.log(line);
	// });
}

const updateHistorical = async () => {
	const filePath = path.resolve(__dirname, 'historical.json');
	await readFileAsync(filePath).then(data => {
		const result = JSON.parse(data);
		for (let key in result) {
			const investmentIdx = money.investments.findIndex(i => i.yahooSymbol === key);
			if (investmentIdx >= 0) {
				money.investments[investmentIdx].historical = result[key];
			}
		}
		console.log('updateHistorical inside done...');
		return true;
	});
	console.log('updateHistorical outside done...');
	return true;
}

const init = () => {
	money.accountList = [];
	money.shrsInOut = [];
	money.accounts = {};

	var queue = async.queue((task, callback) => {
		parseFile(task.file, callback)
	}, 1);

	queue.drain = async () => {
		await updateInvestmentPrice();
		arrangeCategory();
		arrangePayee();
	}

	fs.readdir(path.resolve(__dirname), (err, files) => {
		for (let i = 0; i < files.length; i++) {
			if (files[i].match(/\.qif/i)) {
				queue.push({file: files[i]});
			}
		}
	});
}

exports.updateqifFile = async (account) => {
	const filePath = path.resolve(__dirname, `./${account}.qif`);
	money.accounts[account].transactions.sort((a, b) => {
		if (a.date < b.date) {
			return -1;
		}
		if (b.date < a.date) {
			return 1;
		}
		if (typeof a.payee !== 'undefined') {
			if (a.payee < b.payee) {
				return -1;
			}
			if (b.payee < a.payee) {
				return 1;
			}
		}
		if (typeof a.investment !== 'undefined') {
			if (a.investment < b.investment) {
				return -1;
			}
			if (b.investment < a.investment) {
				return 1;
			}
		}
		if (typeof a.activity !== 'undefined') {
			if (a.activity < b.activity) {
				return -1;
			}
			if (b.activity < a.activity) {
				return 1;
			}
		}
		return 0;
	});
	const token = await json2qif.writeToFile(money.accounts[account], filePath);

	const investmentFile = account.match(/_Cash/) ? `${account.substr(0, account.length  -5)}.qif` : `${account}.qif`
	const cashFile = account.match(/_Cash/) ? `${account}.qif` : `${account}_Cash.qif`;

	const token2 = await parseFile(investmentFile);
	const token3 = await parseFile(cashFile);
	updateInvestmentAccount();
	arrangeCategory();
	arrangePayee();
}

const updateInvestmentPrice = () => {
	return new Promise((resolve, reject) => {
		arrangeInvestmemt(resolve);
	});
}

exports.updateInvestmentPrice = updateInvestmentPrice;

const getBalanceToDate = (name, transactions, accounts) => {
	let balance = 0;
	for (let i = 0; i < transactions.length; i++) {
		const transaction = transactions[i];
		if (transaction) {
			const activity = transaction.activity;
			balance += transaction.amount;
		}
	}

	// We have to subtract ivestment in investment cash account
	if (name.match(/_Cash/i)) {
		const investmemtTransaction = accounts[name.split('_')[0]];
		if (investmemtTransaction && investmemtTransaction.transactions) {
			for (let i = 0; i < investmemtTransaction.transactions.length; i++) {
				const transaction = investmemtTransaction.transactions[i];
				if (transaction.activity === 'Buy' || transaction.activity === 'MiscExp') {
					balance -= transaction.amount;
				} else if (transaction.activity === 'Sell' || transaction.activity === 'Div') {
					balance += transaction.amount;
				}
			}
		}
	}

	return balance;
}

const getInvestmentBalanceToDate = (investments, date) => {
	const currentYearMonth = moment().format('YYYY-MM');
	let balance = 0;
	if (investments.length > 0) {
		balance = investments.map((i) => {
			if (i.quantity > 0) {
				const dateYearMonth = date.substr(0,7);
				const investment = money.investments.find(j => j.name === i.name);
				const historical = investment && investment.historical && investment.historical.filter(k => {
					return k.date.substr(0,7) === dateYearMonth;
				});
				const historicalPrice = historical && historical.length > 0 && historical[historical.length - 1].close;
				if (currentYearMonth === dateYearMonth) {
					return investment.price * i.quantity;
				}
				if (historicalPrice) {
					return historicalPrice * i.quantity
				}
			}
			return i.price * i.quantity
		}).reduce( (prev, curr) => prev + curr );
	}

	return balance;
}

exports.getNetWorth = (date) => {
	const dateAccounts = {};
	let netWorth = 0;
	for (let i in money.accounts) {
		dateAccounts[i] = {};
		dateAccounts[i].type = money.accounts[i].type;
		if (money.accounts[i].transactions) {
			dateAccounts[i].transactions = money.accounts[i].transactions.filter(i => i.date <= date);
			if (dateAccounts[i].type === 'Invst') {
				const investments = getInvestmentList(i, dateAccounts[i].transactions);
				netWorth += getInvestmentBalanceToDate(investments, date);
			} else {
				netWorth += getBalanceToDate(i, dateAccounts[i].transactions, dateAccounts);
			}
		}
	}
	return netWorth;
}

const sendBalanceUpdateNotification = () => {
	const balance = money.accountList.map((i) => i.balance).reduce( (prev, curr) => prev + curr );
	const netWorth = parseInt(balance, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
	messaging.sendNotification('NetWorth Update', `Today's NetWorth is ${netWorth}`);
}

init();

var dailyArrangeInvestmemtjob = new CronJob('00 40 15 * * 1-5', async () => {
		/*
		 * investment update automation.
		 * Runs week day (Monday through Friday)
		 * at 05:00:00 AM.
		 */
		console.log('00 40 15 daily dailyArrangeInvestmemtjob started');

		await updateInvestmentPrice();
		sendBalanceUpdateNotification();
	}, () => {
		/* This function is executed when the job stops */
		console.log('00 40 15 daily dailyArrangeInvestmemtjob ended');
	},
	true, /* Start the job right now */
	'Asia/Seoul' /* Time zone of this job. */
);

var monthlyUpdateHistoricaljob = new CronJob('00 00 9 1 * *', async () => {
		/*
		 * update historical automation.
		 * Runs every 1st day of month, and write last day of previous month price
		 * at 03:00:00 AM.
		 */
		console.log('00 00 03 monthly monthlyUpdateHistoricaljob started');
		const filePath = path.resolve(__dirname, 'historical.json');
		const { investments } =  money;
		const historical = await readFileAsync(filePath).then(data => {
			const result = JSON.parse(data);
			return result;
		});
		let date = new Date();
		date.setDate(date.getDate() - 1);

		for (let i = 0; i < investments.length; i++) {
			const key = investments[i].yahooSymbol;
			const price = investments[i].price;
			if (typeof historical[key] !== 'undefined') {
				historical[key].unshift({
					date: `${moment(date).format('YYYY-MM-DD')}T18:00:00.000Z`,
					close: price
				});
			} else {
				historical[key] = [
					{
						date: `${moment(date).format('YYYY-MM-DD')}T18:00:00.000Z`,
						close: price
					}
				];
			}
		}
		writeFileAsync(filePath, historical);
		return true;
	}, () => {
		/* This function is executed when the job stops */
		console.log('00 00 03 monthly monthlyUpdateHistoricaljob ended');
	},
	true, /* Start the job right now */
	'Asia/Seoul' /* Time zone of this job. */
);

var weeklyBackupjob = new CronJob('00 00 03 * * 0', () => {
		/*
		 * investment update automation.
		 * Runs week day (Monday through Friday)
		 * at 05:00:00 AM.
		 */
		console.log('00 00 03 weekly weeklyBackupjob started');

		const backupDir = `backup_${moment().format('YYYYMMDD')}`;

		exec(`mkdir ${backupDir}`, {cwd: __dirname});
		exec(`cp *.qif ${backupDir}/`, {cwd: __dirname});
		exec(`cp *.json ${backupDir}/`, {cwd: __dirname});
		exec(`cp *.xlsx ${backupDir}/`, {cwd: __dirname});
	}, () => {
		/* This function is executed when the job stops */
		console.log('00 00 03 weekly weeklyBackupjob ended');
	},
	true, /* Start the job right now */
	'Asia/Seoul' /* Time zone of this job. */
);
