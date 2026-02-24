const { Snaptrade } = require('snaptrade-typescript-sdk');

const snaptrade = new Snaptrade({
	clientId: process.env.SNAPTRADE_CLIENT_ID,
	consumerKey: process.env.SNAPTRADE_CONSUMER_KEY
});

const USER_ID = process.env.SNAPTRADE_USER_ID;
const USER_SECRET = process.env.SNAPTRADE_USER_SECRET;

async function getAllAccountsData () {
	const accountsRes = await snaptrade.accountInformation.listUserAccounts({
		userId: USER_ID,
		userSecret: USER_SECRET
	});

	const accounts = accountsRes.data;

	const accountsWithData = await Promise.all(
		accounts.map(async (account) => {
			const [positionsRes, balancesRes] = await Promise.all([
				snaptrade.accountInformation.getUserAccountPositions({
					accountId: account.id,
					userId: USER_ID,
					userSecret: USER_SECRET
				}),
				snaptrade.accountInformation.getUserAccountBalance({
					accountId: account.id,
					userId: USER_ID,
					userSecret: USER_SECRET
				})
			]);
			return {
				id: account.id,
				name: account.name,
				number: account.number,
				institution_name: account.institution_name,
				positions: positionsRes.data,
				balances: balancesRes.data
			};
		})
	);

	return { accounts: accountsWithData };
}

module.exports = { getAllAccountsData };
