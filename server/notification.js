const moment = require('moment-timezone');
const uuidv1 = require('uuid/v1');

const messaging = require('./messaging');
const couchdb = require('./couchdb');

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

const findCategoryByPayee = (transactions, transaction) => {
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
	} else if (transaction.payee.match(/홈플러스/) || transaction.payee.match(/이마트/) ||
						transaction.payee.match(/롯데마트/) || transaction.payee.match(/코스트코/)) {
		transaction.category = '식비';
		transaction.subcategory = '식료품';
	} else if (transaction.payee.match(/COSTCO WHSE/i) || transaction.payee.match(/HANKOOK SUPERMARKET/i) ||
						transaction.payee.match(/WAL-MART/i) || transaction.payee.match(/SAFEWAY/i) || 
						transaction.payee.match(/H MART/i) || transaction.payee.match(/WHOLEFDS/i) ||
						transaction.payee.match(/TARGET/i) || transaction.payee.match(/TRADER JOE/i)) {
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
	} else if (transaction.payee.match(/STARBUCKS/i) || transaction.payee.match(/KRISPY KREME/i)) {
		transaction.category = '식비';
		transaction.subcategory = '군것질';
	} else if (transaction.payee.match(/맥도날드/) || transaction.payee.match(/VIPS/) ||
						transaction.payee.match(/본죽/) || transaction.payee.match(/신촌설렁탕/) ||
						transaction.payee.match(/아웃백/) || transaction.payee.match(/계절밥상/)) {
		transaction.category = '식비';
		transaction.subcategory = '외식';
	} else if (transaction.payee.match(/POPEYES/i) || transaction.payee.match(/PANDA EXPRESS/i) ||
						transaction.payee.match(/CHICK-FIL-A/i) || transaction.payee.match(/IN N OUT BURGER/i) ||
						transaction.payee.match(/TACO BELL/i)) {
		transaction.category = '식비';
		transaction.subcategory = '외식';
	} else if (transaction.payee.match(/주유소/) || transaction.payee.match(/SK네트웍스/)) {
		transaction.category = '교통비';
		transaction.subcategory = '연료비';
	} else if (transaction.payee.match(/COSTCO GAS/i) || transaction.payee.match(/ARCO/i)) {
		transaction.category = '교통비';
		transaction.subcategory = '연료비';
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

		console.log(body.text);

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
			transaction = findCategoryByPayee(couchTransactions, transaction);
			transaction._id = `${transaction.date}:${account}:${uuidv1()}`;
			transaction.accountId = (account === '급여계좌' || account === 'BoA') ?`account:Bank:${account}` : `account:CCard:${account}`;
			await couchdb.addTransaction(transaction);
			await couchdb.addNotification({
				_id: `${transaction.date}:${uuidv1()}`,
				packageName: body.packageName,
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
