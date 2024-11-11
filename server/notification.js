const moment = require('moment-timezone');
const uuidv1 = require('uuid/v1');

const messaging = require('./messaging');
const couchdb = require('./couchdb');

const {
	GoogleGenerativeAI,
	HarmCategory,
	HarmBlockThreshold,
} = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const generationConfig = {
	temperature: 1,
	topP: 0.95,
	topK: 64,
	maxOutputTokens: 8192,
	responseMimeType: "text/plain",
};

const _lastTransaction = {
	packageName: '',
	text: '',
	date: new Date()
};

const isDuplicatedTransaction = (body) => {
	if (_lastTransaction.packageName === body.packageName && _lastTransaction.text === body.text) {
		const diff = new Date() - _lastTransaction.date;
		if (diff < 10 * 1000) {
			return true;
		}
	}
	return false;
}

const setLastTransaction = (body) => {
	_lastTransaction.packageName = body.packageName;
	_lastTransaction.text = body.text;
	_lastTransaction.date = new Date();
}

const findCategoryFromGemini = async (transaction) => {
	const categoryList = await couchdb.getCategoryList();
	const categoryListString = categoryList.filter(item => !item.startsWith("[")).join(", ");
	const model = genAI.getGenerativeModel({
		model: 'gemini-1.5-flash',
		systemInstruction: 'Below are the categories. Just respond with the category only. If you can\'t find the category, reply with 분류없음\n' +
		categoryListString
	});

	const chatSession = model.startChat({
		generationConfig,
		history: [],
	  });

	  const result = await chatSession.sendMessage(`What is the best category for ${transaction.payee}?`);
	  return result.response.text().replace(/\s+$/g, '');
}

const findCategoryByPayee = async (transactions, transaction) => {
	const matchTransaction = transactions.find(i => i.payee === transaction.payee || i.originalPayee === transaction.payee);
	if (matchTransaction) {
		if (matchTransaction.payee !== transaction.payee) {
			transaction.originalPayee = transaction.payee;
			transaction.payee = matchTransaction.payee;
		}
		if (matchTransaction.category) {
			transaction.category = matchTransaction.category;
		}
		if (matchTransaction.subcategory) {
			transaction.subcategory = matchTransaction.subcategory;
		}
	} else {
		const category = await findCategoryFromGemini(transaction);
		console.log("category from Gemini: ", category);
		const splitCategory = category.split(':');

		transaction.category = splitCategory[0];
		if (splitCategory.length > 1) {
			transaction.subcategory = splitCategory[1];
		}
	}

	return transaction;
};

exports.addTransaction = async function (body) {
	let result = false;

	
	if (body && body.packageName && body.text) {
		if (isDuplicatedTransaction(body)) {
			console.log('duplicated transaction');
			return false;
		}
		setLastTransaction(body);

		let account = '';
		let items = [];
		let transaction = {};

		// const dateString = text.match(/\d{2}\/\d{2}/);
		// const date = dateString && moment(dateString, 'MM/DD').format('YYYY-MM-DD');
		// const amount = text.replace(',', '').match(/\d{1,10}원/);
		// const items = text.replace('\n', ' ').split(' ');
		// const payee = items & item.length > 0 && item[item.length - 1];

		console.log(body.title, body.text);

		if (body.text.match(/승인취소/g)) {
			// do nothing
		} else if (body.packageName.match(/com\.ex\.plus_hipasscard/i)) {
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
		} else if (body.packageName.match(/com\.wooricard\.smartapp/i)) {
			account = '급여계좌';
			items = body.text.split('\n');
			transaction = {
				date: items[0] && moment(items[0].match(/\d{2}\.\d{2}/), 'MM.DD').format('YYYY-MM-DD'),
				amount: items[0] && parseInt(items[0].replace(',', '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g,''), 10) * (-1),
				payee: items[1],
				category: '분류없음'
			};
		} else if (body.packageName.match(/com\.kbankwith\.smartbank/i)) {
			account = '생활비카드';
			items = body.text.split(' ');
			if (body.text.match(/케이뱅크/g)) {
				transaction = {
					date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[6] && parseInt(items[6].replace(/[^0-9]/g,''), 10) * (-1),
					payee: items[10] ? `${items[9]} ${items[10]}` : items[9],
					category: '분류없음'
				};
			} else if (body.text.match(/체크승인/g)) {
				if (items[4].match(/\d{2}\/\d{2}/)) {
					transaction = {
						date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
						amount: items[1] && parseInt(items[1].replace(/[^0-9]/g,''), 10) * (-1),
						payee: items[2],
						category: '분류없음'
					};
				} else if (items[5].match(/\d{2}\/\d{2}/)) {
					transaction = {
						date: items[5] && moment(items[5], 'MM/DD').format('YYYY-MM-DD'),
						amount: items[1] && parseInt(items[1].replace(/[^0-9]/g,''), 10) * (-1),
						payee: `${items[2]} ${items[3]}`,
						category: '분류없음'
					};
				}
			}
		} else if (body.packageName.match(/com\.americanexpress\.android\.acctsvcs\.us/i)) {
			account = 'BoA';
			transaction = {
				date: moment().tz('America/Los_Angeles').format('YYYY-MM-DD'),
				amount: body.text.replace(',', '').match(/-?\$[0-9]+[\.]*[0-9]*/)[0].replace('$', '') * (-1),
				payee: body.text.match(/ at ([^;]+)/)[1].replace(/.$/,''),
				category: '분류없음'
			};
		} else if (body.packageName.match(/com\.robinhood\.money/i)) {
			account = 'BoA';
			const dollorMatch = body.text.replace(',', '').match(/\$(\d+(?:\.\d+)?)/);
			if (body.title !== 'Upcoming payment' && body.title && dollorMatch) {
				transaction = {
					date: moment().tz('America/Los_Angeles').format('YYYY-MM-DD'),
					amount: dollorMatch[1] * (-1),
					payee: body.title,
					category: '분류없음'
				};
			}
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
		} else if (body.text.match(/SC은행BC\(9528\)승인/g)) {
			account = '급여계좌';
			items = body.text.split('\n');
			transaction = {
				date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
				amount: items[3] && parseInt(items[3].replace(',', '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g,''), 10) * (-1),
				payee: items[5],
				category: '분류없음'
			};
		} else if (body.text.match(/우리\(1912\)승인/g)) {
			account = '급여계좌';
			items = body.text.split('\n');
			transaction = {
				date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
				amount: items[3] && parseInt(items[3].replace(',', '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g,''), 10) * (-1),
				payee: items[5],
				category: '분류없음'
			};
		} else if (body.text.match(/SC은행BC\(2314\)승인/g) || body.text.match(/SC제일BC\(2314\)승인/g)) {
			account = '생활비카드';
			items = body.text.split('\n');
			transaction = {
				date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
				amount: items[3] && parseInt(items[3].replace(',', '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g,''), 10) * (-1),
				payee: items[5],
				category: '분류없음'
			};
		} else if (body.text.match(/현대카드 승인/g)) {
			account = '생활비카드';
			items = body.text.split('\n');
			transaction = {
				date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
				amount: items[3] && parseInt(items[3].replace(',', '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g,''), 10) * (-1),
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
			} else if (body.text.match(/해외승인/g)) { // exclude oversea credit charge
				transcation = {};
			} else {
				transaction = {
					date: items[5] && moment(items[5], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[3] && parseInt(items[3].replace(/[^0-9]/g,''), 10) * (-1),
					payee: items[7],
					category: '분류없음'
				};
			}
		} else if (body.text.match(/BofA/g)) {
			account = 'BoA';
			items = body.text.split(', ');
			transaction = {
				date: items[3] && moment(items[3], 'MM/DD/YY').format('YYYY-MM-DD'),
				amount: items[0] && parseFloat(items[0].replace(',', '').match(/\$?[0-9]+(\.[0-9][0-9])?$/)[0].replace('$','')) * (-1),
				payee: items[2],
				category: '분류없음'
			};
		} else if (body.text.match(/Chase Sapphire/g)) {
			account = 'BoA';
			date = body.text.match(/(?<= on\s+).*?(?=\s+at)/gs);
			transaction = {
				date: date ? moment(date, 'MMM DD, YYYY').format('YYYY-MM-DD') : moment().tz('America/Los_Angeles').format('YYYY-MM-DD'),
				amount: body.text.replace(',', '').match(/-?\$[0-9]+[\.]*[0-9]*/)[0].replace('$', '') * (-1),
				payee: body.text.match(/(?<=with\s+).*?(?=\s+on)/gs)[0],
				category: '분류없음'
			};
		}

		if (account && transaction.date && transaction.date !== 'Invalid date' && transaction.payee && transaction.amount) {
			const couchTransactions = await couchdb.getTransactions();
			transaction = await findCategoryByPayee(couchTransactions, transaction);
			transaction._id = `${transaction.date}:${account}:${uuidv1()}`;
			transaction.accountId = (account === '급여계좌' || account === 'BoA') ? `account:Bank:${account}` : `account:CCard:${account}`;
			await couchdb.addTransaction(transaction);
			await couchdb.addNotification({
				_id: `${transaction.date}:${uuidv1()}`,
				packageName: body.packageName,
				title: body.title,
				text: body.text,
				transaction: transaction
			});

			result = true;
		} else {
			result = false;
		}

		messaging.sendNotification(`${result ? '👍' : '⚠️'} Transaction`, JSON.stringify(transaction).replace(/({|})/gi,'').replace(/,/gi, ',\n'), 'receipt');

		return result;
	} else {
		return false;
	}
};

exports.getHistory = async function (size) {
	const history = await couchdb.listNotifications(size);
	return history;
};
