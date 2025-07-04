const moment = require('moment-timezone');
const uuidv1 = require('uuid/v1');
const messaging = require('./messaging');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const settingService = require('./settingService');
const transactionService = require('./transactionService');
const notificationService = require('./notificationService');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const generationConfig = {
	temperature: 1,
	topP: 0.95,
	topK: 64,
	maxOutputTokens: 8192,
	responseMimeType: 'text/plain'
};

let model;
const systemInstructionBase = 'Below are the expense categories. Just respond with the category only. If you can\'t find the category, reply with 분류없음\n';

const initGeminiModel = async () => {
	if (model) return;
	const categoryList = await settingService.getCategoryList();
	const categoryListString = (categoryList || []).filter((item) => !item.startsWith('[')).join(', ');
	const systemInstruction = systemInstructionBase + categoryListString;
	model = genAI.getGenerativeModel({
		model: 'gemini-2.5-flash',
		systemInstruction
	});
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
};

const setLastTransaction = (body) => {
	_lastTransaction.packageName = body.packageName;
	_lastTransaction.text = body.text;
	_lastTransaction.date = new Date();
};

const findCategoryFromGemini = async (transaction) => {
	if (!model) {
		await initGeminiModel();
	}
	const chatSession = model.startChat({
		generationConfig,
		history: []
	});

	const result = await chatSession.sendMessage(`What is the best expense category for ${transaction.payee}?`);
	return result.response.text().replace(/\s+$/g, '');
};

const findCategoryByPayee = async (transactions, transaction) => {
	const matchTransaction = transactions.find((i) => i.payee === transaction.payee || i.originalPayee === transaction.payee);
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
		console.log('category from Gemini: ', category);
		const splitCategory = category.split(':');

		transaction.category = splitCategory[0];
		if (splitCategory.length > 1) {
			transaction.subcategory = splitCategory[1];
		}
	}

	return transaction;
};

const formatNotification = (transaction) => {
	if (!transaction) {
		return '';
	}
	const { amount, payee, category, subcategory } = transaction;
	return `amount: ${amount},\npayee: ${payee},\n\ncategory: ${category}:${subcategory ? subcategory : ''}`;
};

const parsers = [
	{
		matcher: (body) => body.text.match(/승인취소/g),
		parser: () => ({})
	},
	{
		matcher: (body) => body.packageName.match(/com\.ex\.plus_hipasscard/i),
		parser: (body) => ({
			account: 'KB체크카드',
			transaction: {
				date: moment().format('YYYY-MM-DD'),
				amount: parseInt(body.text.replace(/,/g, '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g, ''), 10) * -1,
				payee: '도로비',
				category: '교통비',
				subcategory: '도로비&주차비'
			}
		})
	},
	{
		matcher: (body) => body.packageName.match(/com\.kbcard\.kbkookmincard/i),
		parser: (body) => {
			const items = body.text.split('\n');
			return {
				account: 'KB카드',
				transaction: {
					date: items[3] && moment(items[3], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[2] && parseInt(items[2].replace(/,/g, '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g, ''), 10) * -1,
					payee: items[4],
					category: '분류없음'
				}
			};
		}
	},
	{
		matcher: (body) => body.packageName.match(/com\.wooricard\.smartapp/i),
		parser: (body) => {
			const items = body.text.split('\n');
			return {
				account: '급여계좌',
				transaction: {
					date: items[0] && moment(items[0].match(/\d{2}\.\d{2}/), 'MM.DD').format('YYYY-MM-DD'),
					amount: items[0] && parseInt(items[0].replace(/,/g, '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g, ''), 10) * -1,
					payee: items[1],
					category: '분류없음'
				}
			};
		}
	},
	{
		matcher: (body) => body.packageName.match(/com\.kbankwith\.smartbank/i),
		parser: (body) => {
			const items = body.text.split(' ');
			let transaction = {};
			if (body.text.match(/케이뱅크/g)) {
				transaction = {
					date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[6] && parseInt(items[6].replace(/[^0-9]/g, ''), 10) * -1,
					payee: items[10] ? `${items[9]} ${items[10]}` : items[9],
					category: '분류없음'
				};
			} else if (body.text.match(/체크승인/g)) {
				if (items[4] && items[4].match(/\d{2}\/\d{2}/)) {
					transaction = {
						date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
						amount: items[1] && parseInt(items[1].replace(/[^0-9]/g, ''), 10) * -1,
						payee: items[2],
						category: '분류없음'
					};
				} else if (items[5] && items[5].match(/\d{2}\/\d{2}/)) {
					transaction = {
						date: items[5] && moment(items[5], 'MM/DD').format('YYYY-MM-DD'),
						amount: items[1] && parseInt(items[1].replace(/[^0-9]/g, ''), 10) * -1,
						payee: `${items[2]} ${items[3]} `,
						category: '분류없음'
					};
				}
			}
			return { account: '생활비카드', transaction };
		}
	},
	{
		matcher: (body) => body.packageName.match(/com\.americanexpress\.android\.acctsvcs\.us/i),
		parser: (body) => ({
			account: 'BoA',
			transaction: {
				date: moment().tz('America/Los_Angeles').format('YYYY-MM-DD'),
				amount: body.text.replace(/,/g, '').match(/-?\$[0-9]+[.]*[0-9]*/)[0].replace('$', '') * -1,
				payee: body.text.match(/ at ([^;]+)/)[1].replace(/.$/, ''),
				category: '분류없음'
			}
		})
	},
	{
		matcher: (body) => body.packageName.match(/com\.robinhood\.money/i),
		parser: (body) => {
			const dollorMatch = body.text.replace(/,/g, '').match(/\$(\d+(?:\.\d+)?)/);
			let transaction = {};
			if (body.title !== 'Upcoming payment' && body.title && dollorMatch) {
				transaction = {
					date: moment().tz('America/Los_Angeles').format('YYYY-MM-DD'),
					amount: dollorMatch[1] * -1,
					payee: body.title,
					category: '분류없음'
				};
			}
			return { account: 'BoA', transaction };
		}
	},
	{
		matcher: (body) => body.packageName.match(/com\.usbank\.mobilebanking/i),
		parser: (body) => {
			const dollorMatch = body.text.replace(/,/g, '').match(/\$([0-9,]+(?:\.[0-9]{1,2})?)/);
			const payeeMatch = body.text.match(/2901\s*(.*?)\s*\$/);
			let transaction = {};
			if (dollorMatch && payeeMatch) {
				transaction = {
					date: moment().tz('America/Los_Angeles').format('YYYY-MM-DD'),
					amount: dollorMatch ? parseFloat(dollorMatch[1].replace(/,/g, '')) * -1 : null,
					payee: payeeMatch ? payeeMatch[1].trim() : null,
					category: '분류없음'
				};
			}
			return { account: 'BoA', transaction };
		}
	},
	{
		matcher: (body) => body.text.match(/삼성체크/g),
		parser: (body) => {
			const items = body.text.split('\n');
			return {
				account: '생활비카드',
				transaction: {
					date: items[3] && moment(items[3], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[2] && parseInt(items[2].replace(/[^0-9]/g, ''), 10) * -1,
					payee: items[4],
					category: '분류없음'
				}
			};
		}
	},
	{
		matcher: (body) => body.text.match(/신한체크/g),
		parser: (body) => {
			const items = body.text.split(' ');
			return {
				account: '생활비카드',
				transaction: {
					date: items[2] && moment(items[2], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[4] && parseInt(items[4].replace(/[^0-9]/g, ''), 10) * -1,
					payee: items[5],
					category: '분류없음'
				}
			};
		}
	},
	{
		matcher: (body) => body.text.match(/SC은행BC\(9528\)승인/g),
		parser: (body) => {
			const items = body.text.split('\n');
			return {
				account: '급여계좌',
				transaction: {
					date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[3] && parseInt(items[3].replace(/,/g, '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g, ''), 10) * -1,
					payee: items[5],
					category: '분류없음'
				}
			};
		}
	},
	{
		matcher: (body) => body.text.match(/우리\(1912\)승인/g),
		parser: (body) => {
			const items = body.text.split('\n');
			return {
				account: '급여계좌',
				transaction: {
					date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[3] && parseInt(items[3].replace(/,/g, '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g, ''), 10) * -1,
					payee: items[5],
					category: '분류없음'
				}
			};
		}
	},
	{
		matcher: (body) => body.text.match(/SC은행BC\(2314\)승인/g) || body.text.match(/SC제일BC\(2314\)승인/g),
		parser: (body) => {
			const items = body.text.split('\n');
			return {
				account: '생활비카드',
				transaction: {
					date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[3] && parseInt(items[3].replace(/,/g, '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g, ''), 10) * -1,
					payee: items[5],
					category: '분류없음'
				}
			};
		}
	},
	{
		matcher: (body) => body.text.match(/현대카드 승인/g),
		parser: (body) => {
			const items = body.text.split('\n');
			return {
				account: '생활비카드',
				transaction: {
					date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[3] && parseInt(items[3].replace(/,/g, '').match(/\d{1,10}원/)[0].replace(/[^0-9]/g, ''), 10) * -1,
					payee: items[5],
					category: '분류없음'
				}
			};
		}
	},
	{
		matcher: (body) => body.text.match(/하나/g),
		parser: (body) => {
			const items = body.text.split(' ');
			let transaction = {};
			if (body.text.match(/체크/g)) {
				transaction = {
					date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[3] && parseInt(items[3].replace(/[^0-9]/g, ''), 10) * -1,
					payee: items[6],
					category: '분류없음'
				};
			} else if (body.text.match(/해외승인/g)) {
				// exclude oversea credit charge
			} else {
				transaction = {
					date: items[5] && moment(items[5], 'MM/DD').format('YYYY-MM-DD'),
					amount: items[3] && parseInt(items[3].replace(/[^0-9]/g, ''), 10) * -1,
					payee: items[7],
					category: '분류없음'
				};
			}
			return { account: '급여계좌', transaction };
		}
	},
	{
		matcher: (body) => body.text.match(/BofA/g),
		parser: (body) => {
			const items = body.text.split(', ');
			return {
				account: 'BoA',
				transaction: {
					date: items[3] && moment(items[3], 'MM/DD/YY').format('YYYY-MM-DD'),
					amount: items[0] && parseFloat(items[0].replace(/,/g, '').match(/\$?[0-9]+(\.[0-9][0-9])?$/)[0].replace('$', '')) * -1,
					payee: items[2],
					category: '분류없음'
				}
			};
		}
	},
	{
		matcher: (body) => body.text.match(/Chase Sapphire/g),
		parser: (body) => {
			const date = body.text.match(/(?<= on\s+).*?(?=\s+at)/gs);
			return {
				account: 'BoA',
				transaction: {
					date: date ? moment(date, 'MMM DD, YYYY').format('YYYY-MM-DD') : moment().tz('America/Los_Angeles').format('YYYY-MM-DD'),
					amount: body.text.replace(/,/g, '').match(/-?\$[0-9]+[.]*[0-9]*/)[0].replace('$', '') * -1,
					payee: body.text.match(/(?<=with\s+).*?(?=\s+on)/gs)[0],
					category: '분류없음'
				}
			};
		}
	}
];

exports.addTransaction = async function (body) {
	if (!body || !body.packageName || !body.text) {
		return false;
	}

	if (isDuplicatedTransaction(body)) {
		console.log('duplicated transaction');
		return false;
	}
	setLastTransaction(body);

	const parser = parsers.find((p) => p.matcher(body));

	if (!parser) {
		await messaging.sendNotification('⚠️ Transaction', 'Failed to find parser', 'receipt');
		return false;
	}

	const { account, transaction } = parser.parser(body);

	if (account && transaction && transaction.date && transaction.date !== 'Invalid date' && transaction.payee && transaction.amount) {
		const couchTransactions = await transactionService.getAllTransactions();
		const categorizedTransaction = await findCategoryByPayee(couchTransactions, transaction);
		categorizedTransaction._id = `${categorizedTransaction.date}:${account}:${uuidv1()}`;
		categorizedTransaction.accountId = (account === '급여계좌' || account === 'BoA') ? `account:Bank:${account}` : `account:CCard:${account}`;
		await transactionService.addTransaction(categorizedTransaction);
		await notificationService.addNotification({
			_id: `${categorizedTransaction.date}:${uuidv1()}`,
			packageName: body.packageName,
			title: body.title,
			text: body.text,
			transaction: categorizedTransaction
		});

		await messaging.sendNotification('👍 Transaction', formatNotification(categorizedTransaction), 'receipt');
		return true;
	}

	await messaging.sendNotification('⚠️ Transaction', 'Failed to parse transaction', 'receipt');
	return false;
};

exports.getHistory = async function (size) {
	const history = await notificationService.listNotifications(size);
	return history;
};

if (process.env.NODE_ENV === 'test') {
	exports.reset = () => {
		model = undefined;
		_lastTransaction.packageName = '';
		_lastTransaction.text = '';
		_lastTransaction.date = new Date();
	};
}