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

const getAllAccounts = async () => {
	const accountsResponse = await accountsDB.list({ include_docs: true });
	const allAccounts = accountsResponse.rows.map(i => i.doc);

	return allAccounts;
};

const updateAccountList = singleFlight('updateAccountList', _updateAccountList);

module.exports = {
	updateAccountList,
	getAllAccounts
};