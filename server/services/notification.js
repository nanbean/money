const moment = require('moment-timezone');
// uuid v3 의 'uuid/v1' 서브패스는 v7 부터 없어졌다.
const { v1: uuidv1 } = require('uuid');
const messaging = require('./messaging');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { retryWithBackoff } = require('../utils/retry');
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

	try {
		const result = await retryWithBackoff(
			() => chatSession.sendMessage(`What is the best expense category for ${transaction.payee}?`),
			{ label: 'findCategoryFromGemini' }
		);
		return result.response.text().replace(/\s+$/g, '');
	} catch (error) {
		console.error('Error finding category from Gemini:', error);
		return '분류없음';
	}
};

const findCategoryByPayee = async (transactions, transaction) => {
	const matches = transactions.filter((i) => i.payee === transaction.payee || i.originalPayee === transaction.payee);
	if (matches.length > 0) {
		// Pick the most frequent (category, subcategory) pair across all past
		// transactions with this payee. A one-off manual override is outvoted by
		// the historical norm and won't pollute future auto-categorization.
		const tally = new Map();
		for (const m of matches) {
			const key = JSON.stringify([m.category || '', m.subcategory || '']);
			tally.set(key, (tally.get(key) || 0) + 1);
		}
		const [bestKey] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
		const [bestCategory, bestSubcategory] = JSON.parse(bestKey);

		const sample = matches[0];
		if (sample.payee !== transaction.payee) {
			transaction.originalPayee = transaction.payee;
			transaction.payee = sample.payee;
		}
		if (bestCategory) {
			transaction.category = bestCategory;
		}
		if (bestSubcategory) {
			transaction.subcategory = bestSubcategory;
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
	return `amount: ${amount},\npayee: ${payee},\ncategory: ${category}${subcategory ? `:${subcategory}` : ''}`;
};

const parsers = [
	{
		matcher: (body) => body.text.match(/승인취소/g),
		parser: () => ({})
	},
	{
		matcher: (body) => body.packageName.match(/com\.ex\.plus_hipasscard/i),
		parser: (body) => {
			const amountMatch = body.text.replace(/,/g, '').match(/\d{1,10}원/);
			if (!amountMatch) return {};
			return {
				account: 'KB체크카드',
				transaction: {
					date: moment().format('YYYY-MM-DD'),
					amount: parseInt(amountMatch[0].replace(/[^0-9]/g, ''), 10) * -1,
					payee: '도로비',
					category: '교통비',
					subcategory: '도로비&주차비'
				}
			};
		}
	},
	{
		matcher: (body) => body.packageName.match(/com\.kbcard\.kbkookmincard/i),
		parser: (body) => {
			const items = body.text.split('\n');
			const amountMatch = items[2] && items[2].replace(/,/g, '').match(/\d{1,10}원/);
			if (!amountMatch) return {};
			// 첫 줄이 'KB국민카드1*8*승인' 또는 '...취소' 다.
			// '승인취소' 문구는 배열 맨 앞 파서가 먼저 잡아 여기까지 오지 않는다.
			//
			// 취소는 거래를 만들지 않는다. 원본을 자동으로 찾아 고치려면 상호·금액·
			// 날짜로 지목해야 하는데, 실측 재생에서 같은 상호의 다른 결제를 집는
			// 경우가 나왔다 (취소 6,000 이 -6,500 결제를, 취소 11,600 이 -17,900
			// 결제를 골랐다). 사람이 판단하는 편이 안전하다.
			if ((items[0] || '').trim().endsWith('취소')) return {};

			return {
				account: 'KB카드',
				transaction: {
					date: items[3] && moment(items[3], 'MM/DD').format('YYYY-MM-DD'),
					amount: parseInt(amountMatch[0].replace(/[^0-9]/g, ''), 10) * -1,
					payee: items[4],
					category: '분류없음'
				}
			};
		}
	},
	{
		// iOS KB Pay. 두 형식으로 온다.
		//   '\n[KB Pay 사용 알림] 신용 6036 09/02 16:13 14,160원 11번가 승인 '
		//   'KB국민카드6036승인 김*심님 14,160원 일시불 09/02 16:13 11번가 누적120,830'
		//
		// 둘 다 한 줄이고 앞뒤에 개행·공백이 붙는다. 상호 위치가 고정되지 않고
		// 공백도 들어가므로('셀렉토커피 동탄') 인덱스 분할 대신 뒤에서부터 최소
		// 일치시킨다. 개행만 공백으로 바꾼다 — 공백 전체를 정규화하면 상호에 든
		// 전각 공백('（유）　아웃백')이 뭉개진다.
		matcher: (body) => body.packageName.match(/^ios\.KBPay$/i),
		parser: (body) => {
			// 카드번호로 계좌를 가른다. 한 앱에서 여러 사람의 카드 알림이 온다.
			// 모르는 번호는 거래를 만들지 않는다 — 엉뚱한 계좌에 기록하는 것보다
			// 알림만 띄우고 사람이 판단하게 두는 편이 낫다.
			const ACCOUNT_BY_CARD = {
				6036: 'KB카드',
				8031: 'KB카드',
				8033: 'KB카드오은미'
			};

			const line = body.text.replace(/\r?\n/g, ' ').trim();

			// '[KB Pay 사용 알림] 신용|체크 <번호> <MM/DD> <HH:mm> <금액>원 <상호> 승인'
			// 취소 문구의 실제 샘플을 본 적이 없어 승인만 거래로 만든다.
			const pay = line.match(
				/\]\s*(?:신용|체크)\s+(\d{4})\s+(\d{2}\/\d{2})\s+\d{1,2}:\d{2}\s+([\d,]+)원\s+(.+?)\s*승인\s*$/
			);
			if (pay) {
				const [, cardNumber, dateText, amountText, payee] = pay;
				const account = ACCOUNT_BY_CARD[cardNumber];
				if (!account) return {};

				return {
					account,
					transaction: {
						date: moment(dateText, 'MM/DD').format('YYYY-MM-DD'),
						amount: parseInt(amountText.replace(/[^0-9]/g, ''), 10) * -1,
						payee,
						category: '분류없음'
					}
				};
			}

			// 'KB국민카드<번호>승인|취소 <이름> <금액>원 [일시불] <MM/DD> <HH:mm> <상호> [누적...]'
			const card = line.match(
				/KB국민카드([0-9*]+)(승인|취소)\s+\S+\s+([\d,]+)원(?:\s+(?!\d{2}\/\d{2})\S+)*\s+(\d{2}\/\d{2})\s+\d{1,2}:\d{2}\s+(.+?)(?:\s+누적[\d,]+원?)?\s*$/
			);
			if (card) {
				const [, cardNumber, kind, amountText, dateText, payee] = card;
				// 취소는 거래를 만들지 않는다 — 안드로이드 파서 주석 참고.
				if (kind === '취소') return {};

				const account = ACCOUNT_BY_CARD[cardNumber];
				if (!account) return {};

				return {
					account,
					transaction: {
						date: moment(dateText, 'MM/DD').format('YYYY-MM-DD'),
						amount: parseInt(amountText.replace(/[^0-9]/g, ''), 10) * -1,
						payee,
						category: '분류없음'
					}
				};
			}

			return {};
		}
	},
	{
		// iOS 롯데카드. 전부 생활비카드로 기록한다.
		//
		//   '\n십일번가 주식회사\n13,050원 승인\nLOCA LIKIT 2.0(7*2*)\n일시불, 09/02 22:08\n누적금액 880,801원'
		//   '\n십일번가 주식회사\n13,050원 승인취소\nLOCA LIKIT 2.0(7*2*)\n일시불, 09/02 22:08\n누적금액 880,801원'
		//
		// KB 와 순서가 반대다 — 상호가 첫 줄이고 금액·상태가 둘째 줄이다. 앞에
		// 개행이 붙고, 마지막에 '누적금액' 줄이 온다.
		//
		// 상태는 정확히 '승인' 일 때만 거래를 만든다. '승인취소' 는 배열 맨 앞
		// 파서도 잡지만 여기서도 독립적으로 걸러 순서에 의존하지 않게 한다.
		// 모르는 상태 문구('부분취소' 등)도 같이 막힌다.
		matcher: (body) => body.packageName.match(/^ios\.lottecard$/i),
		parser: (body) => {
			const lines = body.text.split('\n').map((l) => l.trim()).filter(Boolean);

			// '13,050원 승인' / '13,050원 승인취소'
			// '누적금액 880,801원' 은 숫자로 시작하지 않아 걸리지 않는다.
			let amount = null;
			let status = null;
			lines.some((line) => {
				const m = line.match(/^([\d,]+)원\s*(.+)$/);
				if (!m) return false;
				amount = parseInt(m[1].replace(/[^0-9]/g, ''), 10);
				status = m[2].trim();
				return true;
			});

			// '일시불, 09/02 22:08' — 줄 구성이 달라질 수 있어 전문에서 찾는다.
			const dateMatch = body.text.match(/(\d{2}\/\d{2})\s+\d{1,2}:\d{2}/);
			// 상호는 첫 줄이다.
			const payee = lines[0];

			if (!amount || !status || !dateMatch || !payee) return {};
			// 금액 줄이 첫 줄이면 상호가 없는 다른 형태다.
			if (/^[\d,]+원/.test(payee)) return {};
			// 취소는 거래를 만들지 않는다 — 안드로이드 KB 파서 주석 참고.
			if (status !== '승인') return {};

			return {
				account: '생활비카드',
				transaction: {
					date: moment(dateMatch[1], 'MM/DD').format('YYYY-MM-DD'),
					amount: amount * -1,
					payee,
					category: '분류없음'
				}
			};
		}
	},
	{
		matcher: (body) => body.packageName.match(/com\.wooricard\.smartapp/i),
		parser: (body) => {
			const items = body.text.split('\n');
			const amountMatch = items[0] && items[0].replace(/,/g, '').match(/\d{1,10}원/);
			if (!amountMatch) return {};
			return {
				account: '급여계좌',
				transaction: {
					date: items[0] && moment(items[0].match(/\d{2}\.\d{2}/), 'MM.DD').format('YYYY-MM-DD'),
					amount: parseInt(amountMatch[0].replace(/[^0-9]/g, ''), 10) * -1,
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
		parser: (body) => {
			const amountMatch = body.text.replace(/,/g, '').match(/-?\$[0-9]+[.]*[0-9]*/);
			const payeeMatch = body.text.match(/ at ([^;]+)/);

			if (!amountMatch || !payeeMatch) {
				return {};
			}

			return {
				account: 'BoA',
				transaction: {
					date: moment().tz('America/Los_Angeles').format('YYYY-MM-DD'),
					amount: parseFloat(amountMatch[0].replace('$', '')) * -1,
					payee: payeeMatch[1].replace(/.$/, ''),
					category: '분류없음'
				}
			};
		}
	},
	{
		matcher: (body) => body.packageName.match(/com\.robinhood\.money/i),
		parser: (body) => {
			const dollorMatch = body.text.replace(/,/g, '').match(/\$(\d+(?:\.\d+)?)/);
			let transaction = {};
			const excludedTitles = [
				'Refund: ',
				'Upcoming payment',
				'Important notice',
				'Your transfer is complete',
				'Your withdrawal is complete',
				'Your monthly interest deposit',
				'Your monthly interest deposits'
			];
			if (body.title && !excludedTitles.some(t => body.title.startsWith(t)) && dollorMatch) {
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
			const amountMatch = items[3] && items[3].replace(/,/g, '').match(/\d{1,10}원/);
			if (!amountMatch) return {};
			return {
				account: '급여계좌',
				transaction: {
					date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
					amount: parseInt(amountMatch[0].replace(/[^0-9]/g, ''), 10) * -1,
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
			const amountMatch = items[3] && items[3].replace(/,/g, '').match(/\d{1,10}원/);
			if (!amountMatch) return {};
			return {
				account: '급여계좌',
				transaction: {
					date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
					amount: parseInt(amountMatch[0].replace(/[^0-9]/g, ''), 10) * -1,
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
			const amountMatch = items[3] && items[3].replace(/,/g, '').match(/\d{1,10}원/);
			if (!amountMatch) return {};
			return {
				account: '생활비카드',
				transaction: {
					date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
					amount: parseInt(amountMatch[0].replace(/[^0-9]/g, ''), 10) * -1,
					payee: items[5],
					category: '분류없음'
				}
			};
		}
	},
	{
		// [Web발신] / NH카드6*4*승인 / 김*심 / 52,000원 / 08/28 14:16 / 최선도
		//
		// SC은행BC·우리·현대카드와 같은 6줄 SMS 형식이라 인덱스가 그대로다.
		// 카드번호 마스킹이 '6*4*' 처럼 자리마다 달라서 숫자와 * 를 함께 받는다.
		// 즉시 인출되는 체크카드라 급여계좌로 기록한다 (본인 카드 관례).
		matcher: (body) => body.text.match(/NH카드[0-9*]*승인/g),
		parser: (body) => {
			const items = body.text.split('\n');
			const amountMatch = items[3] && items[3].replace(/,/g, '').match(/\d{1,10}원/);
			if (!amountMatch) return {};
			return {
				account: '급여계좌',
				transaction: {
					date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
					amount: parseInt(amountMatch[0].replace(/[^0-9]/g, ''), 10) * -1,
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
			const amountMatch = items[3] && items[3].replace(/,/g, '').match(/\d{1,10}원/);
			if (!amountMatch) return {};
			return {
				account: '생활비카드',
				transaction: {
					date: items[4] && moment(items[4], 'MM/DD').format('YYYY-MM-DD'),
					amount: parseInt(amountMatch[0].replace(/[^0-9]/g, ''), 10) * -1,
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
			const amountMatch = items[0] && items[0].replace(/,/g, '').match(/\$?[0-9]+(\.[0-9][0-9])?$/);
			if (!amountMatch) return {};
			return {
				account: 'BoA',
				transaction: {
					date: items[3] && moment(items[3], 'MM/DD/YY').format('YYYY-MM-DD'),
					amount: parseFloat(amountMatch[0].replace('$', '')) * -1,
					payee: items[2],
					category: '분류없음'
				}
			};
		}
	},
	{
		matcher: (body) => body.text.match(/Chase Sapphire/g),
		parser: (body) => {
			const dateMatch = body.text.match(/(?<= on\s+).*?(?=\s+at)/gs);
			const amountMatch = body.text.replace(/,/g, '').match(/-?\$[0-9]+[.]*[0-9]*/);
			const payeeMatch = body.text.match(/(?<=with\s+).*?(?=\s+on)/gs);
			if (!amountMatch || !payeeMatch) return {};

			return {
				account: 'BoA',
				transaction: {
					date: dateMatch ? moment(dateMatch, 'MMM DD, YYYY').format('YYYY-MM-DD') : moment().tz('America/Los_Angeles').format('YYYY-MM-DD'),
					amount: parseFloat(amountMatch[0].replace('$', '')) * -1,
					payee: payeeMatch[0],
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

		await messaging.sendNotification('👍 Transaction', formatNotification(categorizedTransaction), 'receipt', 'transactions');
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