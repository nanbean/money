const moment = require('moment-timezone');
const { accountsDB, stocksDB } = require('../db');
const _ = require('lodash');
const pouchdb = require('../pouchdb');
const { getInvestmentList, getInvestmentBalance } = require('../utils/investment');
const { getBalance } = require('../utils/account');

const updateAccountList = async () => {
	console.time('updateAccountList');
	console.log('updateAccountList start', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));

	try {
		const accountsResponse = await accountsDB.list({ include_docs: true });
		const allAccounts = accountsResponse.rows.map(i => i.doc);
		const allTransactions = await pouchdb.getAllTransactions();
		const transactionsByAccount = _.groupBy(allTransactions, 'accountId');
		const kospiResponse = await stocksDB.get('kospi');
		const kosdaqResponse = await stocksDB.get('kosdaq');
		const usResponse = await stocksDB.get('us');
		const allInvestments = [...kospiResponse.data, ...kosdaqResponse.data, ...usResponse.data];

		for (let i = 0; i < allAccounts.length; i++) {
			const account = allAccounts[i];
			const type = account.type;
			const accountId = `account:${type}:${account.name}`;
			const accountTransactions = transactionsByAccount[accountId] || [];

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
	console.timeEnd('updateAccountList');
};

const getAllAccounts = async () => {
	const accountsResponse = await accountsDB.list({ include_docs: true });
	const allAccounts = accountsResponse.rows.map(i => i.doc);

	return allAccounts;
};

module.exports = {
	updateAccountList,
	getAllAccounts
};