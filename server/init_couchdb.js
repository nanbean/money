const config = require('./config');
const nano = require('nano')(`https://${config.couchDBAdminId}:${config.couchDBAdminPassword}@${config.couchDBUrl}`);
const fs = require('fs');
const path = require('path');
const Spooky = require('spooky');
const _ = require('lodash');
const uuidv1 = require('uuid/v1');

const qif2json = require('./qif2json');

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

const parseFile = async (file) => {
	return new Promise(function (resolve, reject) {
		const filePath = path.resolve(__dirname, file);
		const name = path.basename(filePath, '.qif');
		console.log(`parsing ${file} ...`);
		if (fs.existsSync(filePath)) {
			qif2json.parseFile(filePath, async (err, qifData) => {
				const accountsDB = nano.use('accounts_nanbean');
				const transactionsDB = nano.use('transactions_nanbean');

				const type = qifData.type;
				const account = {
					_id: `account:${type}:${name}`,
					name,
					type: qifData.type,
					closed: name.match(/Closed/i) ? true : false
				};
				if (qifData.type == 'Invst') { // Invst should have cash account
					account.cashAccountId = `account:Bank:${name}_Cash`;
				}

				try {
					const accountResponse = await accountsDB.insert(account);
					if (qifData.transactions) {
						qifData.transactions = qifData.transactions.map(i => ({ ...i, _id: `${i.date}:${name}:${uuidv1()}` }));
						await transactionsDB.bulk({ docs: qifData.transactions.map(i => ({ ...i, accountId: accountResponse.id })) });
					}
					console.log(`parsing ${file} done...`);
				} catch (err) {
					console.log(err);
				}
				resolve('done');
			});
		}
	});
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
	console.log('updateAccountList done', new Date());
};

const arrangeCategory = (category) => {
	// let categories = [];
	// let subcategories = [];
	// for (let i in money.accounts) {
	// 	const transactions = money.accounts[i].transactions;
	// 	if (transactions) {
	// 		categories = [...categories, ...transactions.filter(i => i.category).map(i => i.category)];
	// 		subcategories = [...subcategories, ...transactions.filter(i => i.subcategory).map(i => `${i.category}:${i.subcategory}`)];
	// 	}
	// }
	// categories = [...new Set(categories)];
	// if (!categories.find(i => i === '분류없음')) {
	// 	categories.push('분류없음');
	// }
	// subcategories = [...new Set(subcategories)];
	// money.categories = [...categories, ...subcategories];
	// money.categories.sort();
};

const arrangePayee = () => {
	// money.payees = [];
	// let payees = [];
	// for (let i in money.accounts) {
	// 	const transactions = money.accounts[i].transactions;
	// 	if (transactions) {
	// 		payees = [...payees, ...transactions.filter(i => i.payee).map(i => i.payee)];
	// 	}
	// }
	// payees = [...new Set(payees)];
	// money.payees = payees;
	// money.payees.sort();
};

const init = async () => {
	try {
		await nano.db.destroy('accounts_nanbean');
	} catch (err) {
		console.log(err);
	}

	try {
		await nano.db.create('accounts_nanbean');
	} catch (err) {
		console.log(err);
	}

	try {
		await nano.db.destroy('transactions_nanbean');
	} catch (err) {
		console.log(err);
	}

	try {
		await nano.db.create('transactions_nanbean');
	} catch (err) {
		console.log(err);
	}

	try {
		await nano.db.destroy('investments_nanbean');
	} catch (err) {
		console.log(err);
	}

	try {
		await nano.db.create('investments_nanbean');
	} catch (err) {
		console.log(err);
	}

	try {
		await nano.db.destroy('histories_nanbean');
	} catch (err) {
		console.log(err);
	}

	try {
		await nano.db.create('histories_nanbean');
	} catch (err) {
		console.log(err);
	}

	try {
		await nano.db.create('notifications_nanbean');
	} catch (err) {
		console.log(err);
	}

	fs.readdir(path.resolve(__dirname), async (err, files) => {
		for (let i = 0; i < files.length; i++) {
			if (files[i].match(/\.qif/i)) {
				await parseFile(files[i]);
			}
		}
		await arrangeInvestmemt();
		await updateAccountList();
		await updateHistorical();
		arrangeCategory();
		arrangePayee();
	});
};

const updateHistorical = async () => {
	return new Promise(function (resolve, reject) {
		const filePath = path.resolve(__dirname, 'historical.json');
		fs.readFile(filePath, async (err, data) => {
			const historiesDB = nano.use('histories_nanbean');
			const investmentsDB = nano.use('investments_nanbean');
			const investmentsResponse = await investmentsDB.list({ include_docs: true });
			const investments = investmentsResponse.rows.map(i => i.doc);
			const histories = [];
			_.forEach(JSON.parse(data), (value, key) => {
				const investment = investments.find(i => i.yahooSymbol === key);
				histories.push({
					_id: `history:${key.split('.')[0]}`,
					name: investment && investment.name,
					data: value
				});
			});
			try {
				await historiesDB.bulk({ docs: histories });
			} catch (err) {
				console.log(err);
			}
			resolve('done');
		});
		
	});
};

const arrangeInvestmemt = async () => {
	return new Promise(function (resolve, reject) {
		const investmentsDB = nano.use('investments_nanbean');

		console.log('arrangeInvestmemt start', new Date());

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
			console.log('arrangeInvestmemt kospiParsed', new Date());
			// for (let i = 0; i < investments.length; i++) {
			// 	const index = investment.findIndex(item => item === investments[i].name);
			// 	if ( index >= 0 ) {
			// 		investments[i].symbol = symbol[index];
			// 		investments[i].googleSymbol = `KRX:${symbol[index]}`;
			// 		investments[i].yahooSymbol = `${symbol[index]}.KS`;
			// 		investments[i].price = parseFloat(price[index].replace(/,/g, ''));
			// 	}
			// }
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
			console.log('arrangeInvestmemt kospiParsed done', new Date());
		});

		spooky.on('kodaqParsed', async (investments, symbol, price) => {
			console.log('arrangeInvestmemt kodaqParsed', new Date());
			// for (let i = 0; i < investments.length; i++) {
			// 	const index = investment.findIndex(item => item === investments[i].name);
			// 	if ( index >= 0 ) {
			// 		investments[i].symbol = symbol[index];
			// 		investments[i].googleSymbol = `KOSDAQ:${symbol[index]}`;
			// 		investments[i].yahooSymbol = `${symbol[index]}.KQ`;
			// 		investments[i].price = parseFloat(price[index].replace(/,/g, ''));
			// 	}
			// }
			// for (let k = 0; k < investment.length; k++) {
			// 	allinvestments.push({
			// 		name: investment[k],
			// 		symbol: symbol[k],
			// 		googleSymbol : `KOSDAQ:${symbol[k]}`,
			// 		yahooSymbol : `${symbol[k]}.KQ`,
			// 		price: parseFloat(price[k].replace(/,/g, ''))
			// 	});
			// }
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

			// updateInvestmentAccount();

			// await updateHistorical();

			console.log('arrangeInvestmemt done', new Date());
      
			resolve('done');
		});

		// for debug
		// spooky.on('console', function (line) {
		// 	console.log(line);
		// });
	});
};

init();