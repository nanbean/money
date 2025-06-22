const moment = require('moment-timezone');
const { accountsDB, stocksDB } = require('../db');
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
		const kospiResponse = await stocksDB.get('kospi');
		const kosdaqResponse = await stocksDB.get('kosdaq');
		const usResponse = await stocksDB.get('us');
		const allInvestments = [...kospiResponse.data, ...kosdaqResponse.data, ...usResponse.data];

		for (let i = 0; i < allAccounts.length; i++) {
			const account = allAccounts[i];
			const type = account.type;
			const name = account.name;

			let balance = 0;
			let investments = [];

			if (type === 'Invst') {
				investments = getInvestmentList(allInvestments, allTransactions, allTransactions.filter(i => i.accountId === `account:${type}:${name}`));
				balance = getInvestmentBalance(investments);
				const cashAccountTransactions = allTransactions.filter(i => i.accountId === account.cashAccountId);
				const investmentAccountTransactions = allTransactions.filter(i => i.accountId === `account:${type}:${name}`);
				const cashBalance = getBalance(account.cashAccountId.split(':')[2], cashAccountTransactions, investmentAccountTransactions);
				account.cashBalance = cashBalance;
				balance += cashBalance;
			} else {
				balance = getBalance(name, allTransactions.filter(i => i.accountId === `account:${type}:${name}`));
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