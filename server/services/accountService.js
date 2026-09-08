const moment = require('moment-timezone');
const { accountsDB, stocksDB } = require('../db');
const _ = require('lodash');
const transactionDB = require('../db/transactionDB');
const { getInvestmentList, getInvestmentBalance } = require('../utils/investment');
const { getBalance, isInvestmentCash } = require('../utils/account');
const { singleFlight, keyedSingleFlight } = require('../utils/singleFlight');

const readStockPrices = async () => {
	const [kospiResponse, kosdaqResponse, usResponse] = await Promise.all([
		stocksDB.get('kospi'),
		stocksDB.get('kosdaq'),
		stocksDB.get('us')
	]);
	return [...kospiResponse.data, ...kosdaqResponse.data, ...usResponse.data];
};

// 계좌 한 개의 balance·investments 를 다시 계산한다. 문서를 그 자리에서 고친다.
//
// 전체 갱신과 단건 갱신이 이 함수를 같이 쓴다. 두 곳에 잔액 계산이 갈라져
// 있으면 한쪽만 고쳐지는 순간 조용히 어긋난다.
const computeAccount = (account, transactionsByAccount, allTransactions, allInvestments) => {
	// _id 로 직접 찾는다. type+name 조립은 어긋나는 순간 조용히 빈 배열이 된다.
	const accountTransactions = transactionsByAccount[account._id] || [];

	if (account.type === 'Invst') {
		const investments = getInvestmentList(allInvestments, allTransactions, accountTransactions);
		const cashAccountTransactions = transactionsByAccount[account.cashAccountId] || [];
		const cashBalance = getBalance(
			account.cashAccountId.split(':')[2],
			cashAccountTransactions,
			accountTransactions
		);
		account.cashBalance = cashBalance;
		account.investments = investments;
		account.balance = getInvestmentBalance(investments) + cashBalance;
	} else {
		account.investments = [];
		account.balance = getBalance(account.name, accountTransactions);
	}

	return account;
};

const _updateAccountList = async () => {
	const label = `updateAccountList:${Date.now()}`;
	console.time(label);
	console.log('updateAccountList start', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));

	try {
		const [accountsResponse, allTransactions, allInvestments] = await Promise.all([
			accountsDB.list({ include_docs: true }),
			transactionDB.getAllTransactions(),
			readStockPrices()
		]);
		const allAccounts = accountsResponse.rows.map(i => i.doc);
		const transactionsByAccount = _.groupBy(allTransactions, 'accountId');

		allAccounts.forEach(account =>
			computeAccount(account, transactionsByAccount, allTransactions, allInvestments));

		await accountsDB.bulk({ docs: allAccounts });
	} catch (err) {
		console.log(err);
	}
	console.log('updateAccountList done');
	console.timeEnd(label);
};

// 거래가 하나 들어왔을 때 그 계좌만 다시 계산한다.
//
// 예전에는 카드 결제 한 건에도 51개 계좌를 전부 다시 계산했다. 거래가 바뀐
// 계좌 외에는 값이 달라질 이유가 없다.
//
// 아끼는 것:
//   - 비투자 계좌면 시세를 아예 읽지 않는다 (954 KB · 실측 529ms)
//   - 보유 종목 재조립을 17개 계좌가 아니라 필요한 것만
//   - 쓰기가 51개 문서에서 1~2개로
//
// 알림으로 들어오는 거래는 거의 다 카드다 — 시세를 읽지 않는 쪽이다.
const _updateAccount = async (accountId, extraTransactions = []) => {
	const label = `updateAccount:${accountId}`;
	console.time(label);

	try {
		const [accountsResponse, cached] = await Promise.all([
			accountsDB.list({ include_docs: true }),
			transactionDB.getAllTransactions()
		]);
		const allAccounts = accountsResponse.rows.map(i => i.doc);

		const target = allAccounts.find(a => a._id === accountId);
		if (!target) {
			// 계좌를 못 찾으면 조용히 넘기지 않고 전체로 되돌린다.
			console.log(`updateAccount: ${accountId} 를 못 찾았다 — 전체 재계산으로 넘긴다`);
			console.timeEnd(label);
			await updateAccountList();
			return;
		}

		// 방금 넣은 거래가 로컬 복제본에 아직 안 왔을 수 있다. insertTransaction
		// 은 nano 로 CouchDB 에 직접 쓰고, 캐시는 changes 피드로 따라온다.
		// 전체 재계산을 매번 하던 시절에는 다음 거래가 메워줬지만, 계좌별로
		// 갱신하면 다른 계좌의 거래가 메워주지 못한다.
		const seen = new Set(cached.map(t => t._id));
		const missing = extraTransactions.filter(t => t && t._id && !seen.has(t._id));
		const allTransactions = missing.length > 0 ? [...cached, ...missing] : cached;
		if (missing.length > 0) {
			console.log(`updateAccount: 캐시에 없는 거래 ${missing.length}건을 직접 넣었다`);
		}

		// 투자현금 계좌 거래는 부모 Invst 문서의 cashBalance 도 바꾼다.
		// cashAccountId 로 찾는다 — 이름에서 _id 를 조립하면 계좌 이름이
		// 바뀐 순간 부모를 못 찾는다.
		const targets = [target];
		if (isInvestmentCash(target)) {
			const parent = allAccounts.find(a => a.cashAccountId === accountId);
			if (parent) targets.push(parent);
		}

		// 시세는 투자 계좌가 대상일 때만 읽는다.
		const allInvestments = targets.some(a => a.type === 'Invst')
			? await readStockPrices()
			: [];

		const transactionsByAccount = _.groupBy(allTransactions, 'accountId');
		const docs = targets.map(account =>
			computeAccount(account, transactionsByAccount, allTransactions, allInvestments));

		await accountsDB.bulk({ docs });
		console.log(`updateAccount: ${docs.map(d => d._id).join(', ')}`);
	} catch (err) {
		console.error('updateAccount failed:', err?.stack || err?.message || err);
	}
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
// 계좌별로 dedupe 한다. 인자를 무시하는 singleFlight 를 쓰면 다른 계좌를
// 부른 쪽이 앞 계좌의 promise 를 받고 자기 계좌는 갱신되지 않는다.
const updateAccount = keyedSingleFlight('updateAccount', (accountId) => accountId, _updateAccount);

module.exports = {
	updateAccountList,
	updateAccount,
	repriceAccounts,
	getAllAccounts
};