const moment = require('moment-timezone');
const { stocksDB, accountsDB } = require('../db');
const { getInvestmentsFromAccounts } = require('../utils/investment');
const { getKisToken, getKisQuoteKorea, getKisQuoteUS } = require('../kisConnector');

const arrangeKRInvestmemt = async () => {
	const accountsResponse = await accountsDB.list({ include_docs: true });
	const allAccounts = accountsResponse.rows.map(i => i.doc);
	const kospiResponse = await stocksDB.get('kospi', { revs_info: true });
	const investments = getInvestmentsFromAccounts(kospiResponse.data, allAccounts).filter(i => i.quantity > 0);
	const accessToken = await getKisToken();
	const promises = investments.map(i => getKisQuoteKorea(accessToken, i.googleSymbol));
	const results = await Promise.all(promises);

	await stocksDB.insert({
		...kospiResponse,
		date: moment().tz('Asia/Seoul').format('YYYY-MM-DD'),
		data: kospiResponse.data.map((i) => {
			const foundResult = results.find(j => j.googleSymbol === i.googleSymbol);
			const priceString = foundResult?.output?.stck_prpr;
			if (priceString) {
				return {
					...i,
					price: parseInt(priceString, 10)
				};
			} else {
				return i;
			}
		})
	});
};

const arrangeUSInvestmemt = async () => {
	const accountsResponse = await accountsDB.list({ include_docs: true });
	const allAccounts = accountsResponse.rows.map(i => i.doc);
	const usResponse = await stocksDB.get('us', { revs_info: true });
	const investments  = getInvestmentsFromAccounts(usResponse.data, allAccounts).filter(i => i.quantity > 0);
	const accessToken = await getKisToken();
	const promises = investments.map(i => getKisQuoteUS(accessToken, i.googleSymbol));
	const results = await Promise.all(promises);

	await stocksDB.insert({
		...usResponse,
		date: moment().tz('America/Los_Angeles').format('YYYY-MM-DD'),
		data: usResponse.data.map((i) => {
			const foundResult = results.find(j => j.googleSymbol === i.googleSymbol);
			const priceString = foundResult?.output?.last;
			if (priceString) {
				return {
					...i,
					price: parseFloat(priceString)
				};
			} else {
				return i;
			}
		})
	});
};

module.exports = {
	arrangeKRInvestmemt,
	arrangeUSInvestmemt
};