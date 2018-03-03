const router = require('koa-router')();
const money = require('./transaction');
const xlsx = require('node-xlsx');
const Excel = require('exceljs');
const _ = require('lodash');
const multer = require('koa-multer');
const fs = require('fs');
const fetch = require('node-fetch');
const moment = require('moment');
const streamifier = require('streamifier');

const upload = multer({
	storage: multer.memoryStorage()
});

router.get('/api/getAccountList', (ctx, next) => {
	let body = {};

	body.count = money.accountList.length;
	body.list = money.accountList;
	ctx.body = body;
});

router.get('/api/getTransactions', (ctx, next) => {
	let body = {};
	const account = ctx.request.query.account;

	body.account = account;
	body.data = money.accounts[account];
	ctx.body = body;
});

router.get('/api/getAllAccountTransactions', (ctx, next) => {
	ctx.body = money.accounts;
});

// router.get('/api/getTransactionsByCategory', (ctx, next) => {
// 	let body = {};
// 	const category = ctx.request.query.category;
// 	const result = [];
//
// 	for (let i in money.accounts) {
// 		const transactions = money.accounts[i].transactions;
// 		if (transactions) {
// 			const filteredTransactions = transactions.filter(i => i.category === category || i.subcategory === category)
// 			if (filteredTransactions.length > 0) {
// 				result.push({
// 					account: i,
// 					transactions: filteredTransactions
// 				});
// 			}
// 		}
// 	}
//
// 	body = result;
// 	ctx.body = body;
// });

router.get('/api/getAllInvestmentsTransactions', (ctx, next) => {
	const investment = ctx.request.query.investment;

	const body = money.investments.map(i => {
		const item = {};
		const transactions = [];
		const investment = i.name;
		item.investment = investment;
		item.transactions = transactions;

		for (let key in money.accounts) {
			if (money.accounts[key].type === 'Invst') {
				const account = money.accounts[key];
				const investmentTransactions = account.transactions.filter(j => j.investment === investment);
				if (investmentTransactions.length > 0) {
					transactions.push({
						account: key,
						transactions: investmentTransactions
					});
				}
			}
		}

		return item;
	});
	ctx.body = body;
});

router.get('/api/getInvestmentAccountTransactions', (ctx, next) => {
	let body = {};
	const account = ctx.request.query.account;

	body.account = account;
	body.data = money.accounts[account];
	ctx.body = body;
});

router.get('/api/getInvestmentTransactions', (ctx, next) => {
	let body = {};
	const transactions = [];
	const investment = ctx.request.query.investment;

	body.investment = investment;
	for (let key in money.accounts) {
		if (money.accounts[key].type === 'Invst') {
			const account = money.accounts[key];
			const investmentTransactions = account.transactions.filter(i => i.investment === investment);
			if (investmentTransactions.length > 0) {
				transactions.push({
					account: key,
					transactions: investmentTransactions
				});
			}
		}
	}
	body.transactions = transactions;
	ctx.body = body;
});

router.get('/api/getAllInvestmentsTransactions', (ctx, next) => {
	const investment = ctx.request.query.investment;

	const body = money.investments.map(i => {
		const item = {};
		const transactions = [];
		const investment = i.name;
		item.investment = investment;
		item.transactions = transactions;

		for (let key in money.accounts) {
			if (money.accounts[key].type === 'Invst') {
				const account = money.accounts[key];
				const investmentTransactions = account.transactions.filter(j => j.investment === investment);
				if (investmentTransactions.length > 0) {
					transactions.push({
						account: key,
						transactions: investmentTransactions
					});
				}
			}
		}

		return item;
	});
	ctx.body = body;
});

router.get('/api/getCategoryList', (ctx, next) => {
	let body = {};

	body.count = money.categories.length;
	body.list = money.categories;
	ctx.body = body;
});

router.get('/api/getPayeeList', (ctx, next) => {
	let body = {};

	body.count = money.payees.length;
	body.list = money.payees;
	ctx.body = body;
});

router.get('/api/getInvestmentList', (ctx, next) => {
	let body = {};

	body.count = money.allinvestments.length;
	body.list = money.allinvestments;
	ctx.body = body;
});

router.get('/api/getAccountInvestments', (ctx, next) => {
	let body = {};
	const account = ctx.request.query.account;
	const accountItem = money.accountList.find(i => i.name === account);

	if (accountItem && accountItem.investments) {
		body.count = accountItem.investments.length;
		body.investments = accountItem.investments;
		ctx.body = body;
	} else {
		ctx.body = {return: false};
	}
});

router.get('/api/updateInvestmentPrice', async (ctx, next) => {
	let body = {};

	const token = await money.updateInvestmentPrice();
	ctx.body = {return: token};
});

router.post('/api/addTransaction', async (ctx, next) => {
	const body = ctx.request.body;

	if (body && body.account && body.date && body.amount && body.payee && body.category) {
		const transactions = money.accounts[body.account].transactions;
		const transaction = {
			date: body.date,
			amount: body.amount,
			payee: body.payee,
			category: body.category
		}
		if (body.subcategory) {
			transaction.subcategory = body.subcategory;
		}
		transactions.push(transaction);

		const token = await money.updateqifFile(body.account);
		if (body.category.startsWith('[')) {
			let counterAccount;
			if (body.category.match(/(Cash)/) || body.category.match(/(Contributions)/)) {
				counterAccount = body.category.substr(1, body.category.length-2).split(' ')[0] + '_Cash';
			} else {
				counterAccount = body.category.substr(1, body.category.length-2);
			}
			console.log(counterAccount);
			const counterTransactions = money.accounts[counterAccount].transactions;
			const counterTransaction = {
				date: body.date,
				amount: body.amount * (-1),
				payee: body.payee,
				category: `[${body.account}]`
			}
			counterTransactions.push(counterTransaction);

			const token2 = await money.updateqifFile(counterAccount);
		}

		ctx.body = {return: true};
	} else {
		ctx.body = {return: false};
	}
});

router.post('/api/addTransactions', async (ctx, next) => {
	const body = ctx.request.body;

	console.log(body.account)
	console.log(body.transactions)
	if (body && body.account && body.transactions) {
		for (let i = 0; i < body.transactions.length; i++) {
			const transactions = money.accounts[body.account].transactions;
			const transaction = {
				date: body.transactions[i].date,
				amount: body.transactions[i].amount,
				payee: body.transactions[i].payee,
				category: body.transactions[i].category
			}
			if (body.transactions[i].subcategory) {
				transaction.subcategory = body.transactions[i].subcategory;
			}
			console.log(transaction)
			transactions.push(transaction);
		}

		const token = await money.updateqifFile(body.account);

		for (let j = 0; j < body.transactions.length; j++) {
			if (body.transactions[j].category.startsWith('[')) {
				const counterAccount = body.transactions[j].category.substr(1, body.transactions[j].category.length-2);
				const counterTransactions = money.accounts[counterAccount].transactions;
				const counterTransaction = {
					date: body.transactions[j].date,
					amount: body.transactions[j].amount * (-1),
					payee: body.transactions[j].payee,
					category: `[${body.account}]`
				}
				counterTransactions.push(counterTransaction);

				const token2 = await money.updateqifFile(counterAccount);
			}
		}

		ctx.body = {return: true};
	} else {
		ctx.body = {return: false};
	}
});

function findCategoryByPayee (transactions, transaction) {
	const matchTransaction = transactions.find(i => i.payee === transaction.payee);
	if (matchTransaction) {
		if (matchTransaction.category) {
			transaction.category = matchTransaction.category;
		}
		if (matchTransaction.subcategory) {
			transaction.subcategory = matchTransaction.subcategory;
		}
	} else if (transaction.payee.match(/홈플러스/) || transaction.payee.match(/이마트/) ||
						transaction.payee.match(/롯데마트/) || transaction.payee.match(/코스트코/)) {
		transaction.category = '식비';
		transaction.subcategory = '식료품';
	} else if (transaction.payee.match(/스타벅스/) || transaction.payee.match(/이디야/) ||
						transaction.payee.match(/투썸플레이스/) || transaction.payee.match(/탐앤탐스/) ||
						transaction.payee.match(/빽다방/) || transaction.payee.match(/셀렉토/) ||
						transaction.payee.match(/카페/) || transaction.payee.match(/커피/)) {
		transaction.category = '식비';
		transaction.subcategory = '군것질';
	} else if (transaction.payee.match(/위드미/) || transaction.payee.match(/씨유/) ||
						transaction.payee.match(/미니스톱/) || transaction.payee.match(/세븐일레븐/)) {
		transaction.category = '식비';
		transaction.subcategory = '군것질';
	} else if (transaction.payee.match(/맥도날드/) || transaction.payee.match(/VIPS/) ||
						transaction.payee.match(/본죽/) || transaction.payee.match(/신촌설렁탕/) ||
						transaction.payee.match(/아웃백/) || transaction.payee.match(/계절밥상/)) {
		transaction.category = '식비';
		transaction.subcategory = '외식';
	} else if (transaction.payee.match(/주유소/) || transaction.payee.match(/SK네트웍스/)) {
		transaction.category = '교통비';
		transaction.subcategory = '연료비';
	}

	return transaction;
}

router.post('/api/addTransactionWithNotification', async (ctx, next) => {
	const body = ctx.request.body;

	console.log('/api/addTransactionWithNotification');

	if (body && body.packageName && body.text) {
		let account = '';
		if (body.packageName.match(/com\.kbcard\.kbkookmincard/i)) {
			account = 'KB카드';
		} else if (body.packageName.match(/com\.ex\.hipasscard/i)) {
			account = 'KB체크카드';
		}
		let items = [];
		let transaction = {};

		// const dateString = text.match(/\d{2}\/\d{2}/);
		// const date = dateString && moment(dateString, 'MM/DD').format('YYYY-MM-DD');
		// const amount = text.replace(',', '').match(/\d{1,10}원/);
		// const items = text.replace('\n', ' ').split(' ');
		// const payee = items & item.length > 0 && item[item.length - 1];

		console.log(body.text);

		if (body.text.match(/승인취소/g)) {
			// do nothing
		} else if (body.packageName.match(/com\.ex\.hipasscard/i)) {
			account = 'KB체크카드';
			transaction = {
				date: moment().format('YYYY-MM-DD'),
				amount: parseInt(body.text.replace(',', '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g,''), 10) * (-1),
				payee: '도로비',
				category: '교통비',
				subcategory: '도로비&주차비'
			};
		} else if (body.packageName.match(/com\.kbcard\.kbkookmincard/i)) {
			account = 'KB카드';
			items = body.text.split('\n');
			transaction = {
				date: items[3] && moment(items[3], 'MM/DD').format('YYYY-MM-DD'),
				amount: items[2] && parseInt(items[2].replace(',', '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g,''), 10) * (-1),
				payee: items[4],
				category: '분류없음'
			};
		} else if (body.text.match(/케이뱅크/g)) {
			account = '생활비카드';
			items = body.text.split(' ');
			transaction = {
				date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
				amount: items[6] && parseInt(items[6].replace(/[^0-9]/g,''), 10) * (-1),
				payee: items[9],
				category: '분류없음'
			};
		} else if (body.text.match(/삼성체크/g)) {
			account = '생활비카드';
			items = body.text.split('\n');
			transaction = {
				date: items[3] && moment(items[3], 'MM/DD').format('YYYY-MM-DD'),
				amount: items[2] && parseInt(items[2].replace(/[^0-9]/g,''), 10) * (-1),
				payee: items[4],
				category: '분류없음'
			};
		} else if (body.text.match(/신한체크/g)) {
			account = '생활비카드';
			items = body.text.split(' ');
			transaction = {
				date: items[2] && moment(items[2], 'MM/DD').format('YYYY-MM-DD'),
				amount: items[4] && parseInt(items[4].replace(/[^0-9]/g,''), 10) * (-1),
				payee: items[5],
				category: '분류없음'
			};
		} else if (body.text.match(/하나/g)) {
			account = '급여계좌';
			items = body.text.split(' ');
			if (body.text.match(/체크/g)) {
				transaction = {
					date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[3] && parseInt(items[3].replace(/[^0-9]/g,''), 10) * (-1),
					payee: items[6],
					category: '분류없음'
				};
			} else {
				transaction = {
					date: items[5] && moment(items[5], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[3] && parseInt(items[3].replace(/[^0-9]/g,''), 10) * (-1),
					payee: items[7],
					category: '분류없음'
				};
			}
		}

		if (account && transaction.date && transaction.payee && transaction.amount) {
			const transactions = money.accounts[account].transactions;
			transaction = findCategoryByPayee(transactions, transaction);

			transactions.push(transaction);

			const token = await money.updateqifFile(account);
			ctx.body = {return: true};
		} else {
			ctx.body = {return: false};
		}

		fetch(`https://api.telegram.org/bot211661458:AAGQvpckxjbc7bLEI6Tyl4S0yoHqO5qEAKg/sendMessage`, {
			method: 'POST',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				chat_id: 209982269,
				text : JSON.stringify({
					originalPackageName: body.packageName,
					originalText: body.text,
					transaction: transaction,
					parsed: ctx.body.return ? '👍' : '⚠️'
				})
			})
		})
	} else {
		ctx.body = {return: false};
	}
});

router.post('/api/addInvestmentTransaction', async (ctx, next) => {
	const body = ctx.request.body;

	if (body && body.account && body.date && body.investment &&	body.activity) {
		const transactions = money.accounts[body.account].transactions;
		const transaction = {
			date: body.date,
			investment: body.investment,
			activity: body.activity,
		};
		// {"date":"2011-05-06","amount":0,"activity":"ShrsOut","investment":"휴스틸","price":null,"quantity":500}
		// {"date":"2017-08-28","amount":4277250,"activity":"Div","investment":"맥쿼리인프라","price":null,"quantity":null,"category":"투자 수익"}
		// {"date":"2015-12-31","amount":611010,"activity":"MiscExp","investment":"맥쿼리인프라","price":null,"quantity":null,"category":"세금","subcategory":"소득세"}
		if (body.activity !== 'Div' && body.activity !== 'MiscExp') {
			if (typeof body.quantity !== 'undefined') {
				transaction.quantity = body.quantity;
			}
		} else {
			transaction.quantity = null;
		}
		if (body.activity !== 'ShrsOut' && body.activity !== 'ShrsIn' && body.activity !== 'Div' && body.activity !== 'MiscExp') {
			if (typeof body.price !== 'undefined') {
				transaction.price = body.price;
			}
		} else {
			transaction.price = null;
		}
		if (body.activity !== 'ShrsOut' && body.activity !== 'ShrsIn' && body.activity !== 'Div' && body.activity !== 'MiscExp') {
			if (typeof body.commission !== 'undefined') {
				if (body.commission !== 0) {
					transaction.commission = body.commission;
				}
			}
			if (body.commission === 0) {
				delete transaction.commission;
			}
		}
		if (body.activity !== 'ShrsOut' && body.activity !== 'ShrsIn') {
			if (typeof body.amount !== 'undefined') {
				transaction.amount = body.amount;
			}
		} else {
			transaction.amount = 0;
		}
		if (body.activity === 'MiscExp' || body.activity === 'Div') {
			if (typeof body.category !== 'undefined') {
				transaction.amocategoryunt = body.category;
			}
			if (typeof body.subcategory !== 'undefined') {
				transaction.amocategoryunt = body.subcategory;
			}
		}

		transactions.push(transaction);

		token = await money.updateqifFile(body.account);
		ctx.body = {return: true};
	} else {
		ctx.body = {return: false};
	}
});

router.post('/api/deleteTransaction', async (ctx, next) => {
	const body = ctx.request.body;

	if (body && body.account) {
		let idx;
		if (body.subcategory) {
			idx = money.accounts[body.account].transactions.findIndex(i => i.date === body.date && i.amount === body.amount && i.payee === body.payee && i.category === body.category && i.subcategory === body.subcategory);
		} else {
			idx = money.accounts[body.account].transactions.findIndex(i => i.date === body.date && i.amount === body.amount && i.payee === body.payee && i.category === body.category);
		}

		if (idx >= 0) {
			money.accounts[body.account].transactions.splice(idx, 1);
			const token = await money.updateqifFile(body.account);
		}

		if (body.category.startsWith('[')) {
			const counterAccount = body.category.substr(1, body.category.length-2);
			let counterIdx;
			if (body.subcategory) {
				counterIdx = money.accounts[counterAccount].transactions.findIndex(i => i.date === body.date && i.amount === (body.amount *(-1)) && i.payee === body.payee && i.category === `[${body.account}]` && i.subcategory === body.subcategory);
			} else {
				counterIdx = money.accounts[counterAccount].transactions.findIndex(i => i.date === body.date && i.amount === (body.amount *(-1)) && i.payee === body.payee && i.category === `[${body.account}]`);
			}

			if(counterIdx >= 0) {
				money.accounts[counterAccount].transactions.splice(counterIdx, 1);
				const token2 = await money.updateqifFile(counterAccount);
			}
		}
		ctx.body = {return: true};
	} else {
		ctx.body = {return: false};
	}
});

router.post('/api/deleteInvestmentTransaction', async (ctx, next) => {
	const body = ctx.request.body;

	if (body && body.account) {
		let idx;
		let transaction;
		if (body.activity === 'Buy' || body.activity === 'Sell') {
			if (typeof body.commission !== 'undefined') {
				idx = money.accounts[body.account].transactions.findIndex(
					i => i.date === body.date && i.investment === body.investment && i.activity === body.activity &&
					i.quantity === body.quantity && i.price === body.price && i.amount === body.amount &&
					i.commission === body.commission);
			} else {
				idx = money.accounts[body.account].transactions.findIndex(
					i => i.date === body.date && i.investment === body.investment && i.activity === body.activity &&
					i.quantity === body.quantity && i.price === body.price && i.amount === body.amount);
			}
		} else if (body.activity === 'Div' || body.activity === 'MiscExp') {
			idx = money.accounts[body.account].transactions.findIndex(
				i => i.date === body.date && i.investment === body.investment && i.activity === body.activity &&
				i.amount === body.amount);
		} else if (body.activity === 'ShrsOut' || body.activity === 'ShrsIn') {
			idx = money.accounts[body.account].transactions.findIndex(
				i => i.date === body.date && i.investment === body.investment && i.activity === body.activity &&
				i.quantity === body.quantity);
		}

		if (idx >= 0) {
			money.accounts[body.account].transactions.splice(idx, 1);
			const token = await money.updateqifFile(body.account);
		}

		ctx.body = {return: true};
	} else {
		ctx.body = {return: false};
	}
});

router.post('/api/editTransaction', async (ctx, next) => {
	const body = ctx.request.body;

	if (body && body.account && body.date && body.amount && body.payee && body.category) {
		let transaction;
		if (body.subcategory) {
			transaction = money.accounts[body.account].transactions.find(i => i.date === body.date && i.amount === body.amount && i.payee === body.payee && i.category === body.category && i.subcategory === body.subcategory);
		} else {
			transaction = money.accounts[body.account].transactions.find(i => i.date === body.date && i.amount === body.amount && i.payee === body.payee && i.category === body.category);
		}

		if (transaction) {
			if (body.changed) {
				if (body.changed.date) {
					transaction.date = body.changed.date;
				}
				if (typeof body.changed.amount !== 'undefined') {
					transaction.amount = body.changed.amount;
				}
				if (body.changed.payee) {
					transaction.payee = body.changed.payee;
				}
				if (body.changed.category) {
					transaction.category = body.changed.category;
				}
				if (body.changed.subcategory) {
					transaction.subcategory = body.changed.subcategory;
				}
			}
			const token = await money.updateqifFile(body.account);

			if (body.category.startsWith('[')) {
				let counterTransaction;
				const counterAccount = body.category.substr(1, body.category.length-2);
				if (body.subcategory) {
					counterTransaction = money.accounts[counterAccount].transactions.find(i => i.date === body.date && i.amount === (body.amount *(-1)) && i.payee === body.payee && i.category === `[${body.account}]` && i.subcategory === body.subcategory);
				} else {
					counterTransaction = money.accounts[counterAccount].transactions.find(i => i.date === body.date && i.amount === (body.amount *(-1)) && i.payee === body.payee && i.category === `[${body.account}]`);
				}
				if (counterTransaction) {
					if (body.changed) {
						if (body.changed.date) {
							counterTransaction.date = body.changed.date;
						}
						if (typeof body.changed.amount !== 'undefined') {
							counterTransaction.amount = body.changed.amount;
						}
						if (body.changed.payee) {
							counterTransaction.payee = body.changed.payee;
						}
						if (body.changed.category) {
							counterTransaction.category = body.changed.category;
						}
						if (body.changed.subcategory) {
							counterTransaction.subcategory = body.changed.subcategory;
						}
					}
					const token2 = await money.updateqifFile(counterAccount);
				}
			}
			ctx.body = {return: true, index: body.index};
		} else {
			ctx.body = {return: false};
		}
	} else {
		ctx.body = {return: false};
	}
});

router.post('/api/editInvestmentTransaction', async (ctx, next) => {
	const body = ctx.request.body;

	if (body && body.account && body.date && body.investment && body.activity) {
		let transaction;

		if (body.activity === 'Buy' || body.activity === 'Sell') {
			if (typeof body.commission !== 'undefined') {
				transaction = money.accounts[body.account].transactions.find(
					i => i.date === body.date && i.investment === body.investment && i.activity === body.activity &&
					i.quantity === body.quantity && i.price === body.price && i.amount === body.amount &&
					i.commission === body.commission);
			} else {
				transaction = money.accounts[body.account].transactions.find(
					i => i.date === body.date && i.investment === body.investment && i.activity === body.activity &&
					i.quantity === body.quantity && i.price === body.price && i.amount === body.amount);
			}
		} else if (body.activity === 'Div' || body.activity === 'MiscExp') {
			transaction = money.accounts[body.account].transactions.find(
				i => i.date === body.date && i.investment === body.investment && i.activity === body.activity &&
				i.amount === body.amount);
		} else if (body.activity === 'ShrsOut' || body.activity === 'ShrsIn') {
			transaction = money.accounts[body.account].transactions.find(
				i => i.date === body.date && i.investment === body.investment && i.activity === body.activity &&
				i.quantity === body.quantity);
		}

		if (body.changed) {
			if (typeof body.changed.date !== 'undefined') {
				transaction.date = body.changed.date;
			}
			if (typeof body.changed.investment !== 'undefined') {
				transaction.investment = body.changed.investment;
			}
			if (typeof body.changed.activity !== 'undefined') {
				transaction.activity = body.changed.activity;
			}
			if (body.activity !== 'Div' && body.activity !== 'Div' ) {
				if (typeof body.changed.quantity !== 'undefined') {
					transaction.quantity = body.changed.quantity;
				}
			}
			if (body.activity !== 'ShrsOut' && body.activity !== 'ShrsIn' && body.activity !== 'Div') {
				if (typeof body.changed.price !== 'undefined') {
					transaction.price = body.changed.price;
				}
			}
			if (body.activity !== 'ShrsOut' && body.activity !== 'ShrsIn' && body.activity !== 'Div') {
				if (typeof body.changed.commission !== 'undefined') {
					if (body.changed.commission !== 0) {
						transaction.commission = body.changed.commission;
					} else {
						delete transaction.commission;
					}
				}
			}
			if (body.activity !== 'ShrsOut' && body.activity !== 'ShrsIn') {
				if (typeof body.changed.amount !== 'undefined') {
					transaction.amount = body.changed.amount;
				}
			}
			if (body.activity === 'MiscExp' || body.activity === 'Div') {
				if (typeof body.changed.category !== 'undefined') {
					transaction.amocategoryunt = body.changed.category;
				}
				if (typeof body.changed.subcategory !== 'undefined') {
					transaction.amocategoryunt = body.changed.subcategory;
				}
			}
		}
		const token = await money.updateqifFile(body.account);
		ctx.body = {return: true, index: body.index};
	} else {
		ctx.body = {return: false};
	}
});

router.get('/api/getMortgageSchedule', (ctx, next) => {
	workSheetsFromFile = xlsx.parse(`${__dirname}/아낌이모기지론.xlsx`);
	const schedule = workSheetsFromFile[0].data.slice(2).map(i => {
		return {
			no: parseFloat(i[0].replace(/,/g, '')),
			date: i[1],
			amount: parseFloat(i[3].replace(/,/g, '')),
			principal: parseFloat(i[4].replace(/,/g, '')),
			interest: parseFloat(i[5].replace(/,/g, ''))
		}
	});
	ctx.body = {return: true, schedule: schedule};
});

router.get('/api/getNetWorth', (ctx, next) => {
	let body = {};
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
	body.count = dates.length;
	body.list = dates.map(i => {
		return {
			date: i.substr(0,7),
			netWorth: money.getNetWorth(i)
		};
	});
	ctx.body = body;
});

router.get('/api/getInvestmentPrice', (ctx, next) => {
	const investment = ctx.request.query.investment;
	const body = {
		investment: investment,
		price: money.investments.find(i => i.name === investment).price
	};

	ctx.body = body;
});

router.get('/api/getAllInvestmentsPrice', (ctx, next) => {
	const body = money.investments.map(i => {
		const investment = i.name;
		return {
			investment: investment,
			price: money.investments.find(i => i.name === investment).price
		};
	});

	ctx.body = body;
});

router.post('/api/uploadTransactionsXls', upload.single('document'), async (ctx, next) => {
	const { file } = ctx.req;
	console.log(file)
	// const body = {};
	const workSheetsFromBuffer = xlsx.parse(file.buffer);

	console.log(workSheetsFromBuffer[0].data)
	const body = workSheetsFromBuffer[0].data.map(i => {
		const dateString = i[0];
		let date = '';
		if (dateString.match(/\d{4}-\d{2}-\d{2}/)) {
			date = moment(i[0], 'YYYY-MM-DD').format('YYYY-MM-DD')
		} else if (dateString.match(/\d{2}\.\d{2}\.\d{2}/)) {
			date = moment(i[0], 'YY.MM.DD').format('YYYY-MM-DD')
		} else {
			date = moment().format('YYYY-MM-DD')
		}
		return {
			date: date,
			payee: i[1],
			category: '',
			amount: (typeof i[2] === 'string' ? parseFloat(i[2].replace(/,/g, '')) : parseFloat(i[2]))* (-1)
		}
	}).sort((a, b) => {
		if (a.date < b.date) {
			return -1;
		}
		if (b.date < a.date) {
			return 1;
		}
		return 0;
	});

	//

	// var workbook = new Excel.stream.xlsx.WorkbookReader();
	// workbook.xlsx.read(streamifier.createReadStream(file.buffer))
	// .then(function() {
	// 	const worksheet = workbook.getWorksheet(1);
	// 	console.log(worksheet)
	// });

	ctx.body = body;
});

function getLifetimeFlowList () {
	return new Promise(resolve => {
		const fileName = `${__dirname}/lifetimePlanner.xlsx`;
		const workbook = new Excel.Workbook();
		workbook.xlsx.readFile(fileName)
		.then(function() {
				const worksheet = workbook.getWorksheet(1);
				const nameCol = worksheet.getColumn('A');
				let yearRowNum = -1;
				let flowRowNum = -1;
				const data = []

				nameCol.eachCell(function(cell, rowNumber) {
					const accountItem = money.accountList.find(i => i.name === cell.value && i.type == 'Invst');

					if (accountItem) {
						worksheet.getCell(`B${rowNumber}`).value = accountItem.balance
					}
					if (cell.value === 'Year') {
						yearRowNum = rowNumber
					}
					if (cell.value === '자산') {
						flowRowNum = rowNumber
					}
				});
				var yearList = worksheet.getRow(yearRowNum).values.filter(i => Number.isInteger(i)).map(i => i);
				var flowList = worksheet.getRow(flowRowNum).values.filter(i => i.result).map(i => i.result);
				var flowInflationList = worksheet.getRow(flowRowNum+1).values.filter(i => i.result).map(i => i.result);

				for (let i = 0; i < yearList.length; i++) {
					data.push({
						year: yearList[i],
						amount: flowInflationList[i],
						amountInflation: flowList[i]
					});
				}

				workbook.xlsx.writeFile(fileName).then(function() {
				});

				resolve(data);
		});
	});
}

router.get('/api/getLifetimeFlow', async (ctx, next) => {
	const list = await getLifetimeFlowList();
	ctx.body = {
		count: list.length,
		list: list
	};
});

module.exports = router;
