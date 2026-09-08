const moment = require('moment-timezone');
const { accountsDB, stocksDB } = require('../db');
const _ = require('lodash');
const transactionDB = require('../db/transactionDB');
const { getInvestmentList, getInvestmentBalance } = require('../utils/investment');
const { getBalance } = require('../utils/account');
const { singleFlight } = require('../utils/singleFlight');

const _updateAccountList = async () => {
	const label = `updateAccountList:${Date.now()}`;
	console.time(label);
	console.log('updateAccountList start', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));

	try {
		const [accountsResponse, allTransactions, kospiResponse, kosdaqResponse, usResponse] = await Promise.all([
			accountsDB.list({ include_docs: true }),
			transactionDB.getAllTransactions(),
			stocksDB.get('kospi'),
			stocksDB.get('kosdaq'),
			stocksDB.get('us')
		]);
		const allAccounts = accountsResponse.rows.map(i => i.doc);
		const transactionsByAccount = _.groupBy(allTransactions, 'accountId');
		const allInvestments = [...kospiResponse.data, ...kosdaqResponse.data, ...usResponse.data];

		for (let i = 0; i < allAccounts.length; i++) {
			const account = allAccounts[i];
			const type = account.type;
			// _id 로 직접 찾는다. type+name 조립은 어긋나는 순간 조용히 빈 배열이 된다.
			const accountTransactions = transactionsByAccount[account._id] || [];

			let balance = 0;
			let investments = [];

			if (type === 'Invst') {
				investments = getInvestmentList(allInvestments, allTransactions, accountTransactions);
				balance = getInvestmentBalance(investments);
				const cashAccountTransactions = transactionsByAccount[account.cashAccountId] || [];
				const investmentAccountTransactions = accountTransactions;
				const cashBalance = getBalance(account.cashAccountId.split(':')[2], cashAccountTransactions, investmentAccountTransactions);
				account.cashBalance = cashBalance;
				balance += cashBalance;
			} else {
				balance = getBalance(account.name, accountTransactions);
			}
			allAccounts[i].investments = investments;
			allAccounts[i].balance = balance;
		}
		await accountsDB.bulk({ docs: allAccounts });
	} catch (err) {
		console.log(err);
	}
	console.log('updateAccountList done');
	console.timeEnd(label);
};

// 시세만 바뀐 경우의 계좌 갱신.
//
// 보유 종목을 거래에서 다시 조립하지 않는다. 계좌 문서에 quantity 와
// purchasedPrice·purchasedValue·gain·cashBalance 가 이미 저장돼 있고, 이들은
// 가격과 무관하다. 가격에만 의존하는 값은 price 와 appraisedValue 뿐이다.
//
// 아끼는 건 계산이 아니라 읽기다. 실측(2026-09): 계좌별 재계산은 38ms 인데
// 거래 전체 읽기가 11.8 MB · 789ms 다 (원격은 RAM 952MB 에 스왑을 써서 몇 배
// 느리고, updateAccountList 가 8~13초로 찍힌다).
//
// 비투자 계좌는 건드리지 않는다. 잔액이 거래에만 의존하고, 환율은 계좌 문서에
// 반영되지 않는다 (클라이언트가 표시할 때 settings.exchangeRate 로 환산한다).
const _repriceAccounts = async () => {
	const label = `repriceAccounts:${Date.now()}`;
	console.time(label);

	try {
		const [accountsResponse, kospiResponse, kosdaqResponse, usResponse] = await Promise.all([
			accountsDB.list({ include_docs: true }),
			stocksDB.get('kospi'),
			stocksDB.get('kosdaq'),
			stocksDB.get('us')
		]);
		const allAccounts = accountsResponse.rows.map(i => i.doc);
		const priceMap = new Map(
			[...kospiResponse.data, ...kosdaqResponse.data, ...usResponse.data]
				.map(i => [i.name, i.price])
		);

		const changed = [];
		for (const account of allAccounts) {
			if (account.type !== 'Invst') continue;

			let moved = false;
			const investments = (account.investments || []).map(holding => {
				// 시세에 없는 종목은 이전 가격을 유지한다. 0 으로 떨어뜨리면
				// 상장폐지·이름 변경 한 건이 자산 총액을 깎는다.
				const price = priceMap.has(holding.name) ? priceMap.get(holding.name) : holding.price;
				if (price !== holding.price) moved = true;
				return { ...holding, price, appraisedValue: price * holding.quantity };
			});

			// cashBalance 는 거래에만 의존한다. 저장된 값을 그대로 쓴다.
			const balance = getInvestmentBalance(investments) + (account.cashBalance || 0);
			if (!moved && balance === account.balance) continue;

			changed.push({ ...account, investments, balance });
		}

		// 안 바뀐 문서를 쓰면 _rev 만 올라가고 클라이언트가 헛 동기화를 한다.
		if (changed.length > 0) {
			await accountsDB.bulk({ docs: changed });
		}
		console.log(`repriceAccounts: ${changed.length}/${allAccounts.length} 계좌 갱신`);
	} catch (err) {
		console.error('repriceAccounts failed:', err?.stack || err?.message || err);
	}
	console.timeEnd(label);
};

const getAllAccounts = async () => {
	const accountsResponse = await accountsDB.list({ include_docs: true });
	const allAccounts = accountsResponse.rows.map(i => i.doc);

	return allAccounts;
};

const updateAccountList = singleFlight('updateAccountList', _updateAccountList);
const repriceAccounts = singleFlight('repriceAccounts', _repriceAccounts);

module.exports = {
	updateAccountList,
	repriceAccounts,
	getAllAccounts
};