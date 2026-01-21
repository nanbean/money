const moment = require('moment-timezone');
const stockDB = require('../db/stockDB');
const accountDB = require('../db/accountDB');
const { getInvestmentsFromAccounts } = require('../utils/investment');
const { getKisToken, getKisQuoteKorea, getKisQuoteUS } = require('./kisConnector');

const arrangeKRInvestmemt = async () => {
	const allAccounts = await accountDB.listAccounts();
	const kospiResponse = await stockDB.getStock('kospi');
	const investments = getInvestmentsFromAccounts(kospiResponse.data, allAccounts).filter(i => i.quantity > 0);
	const accessToken = await getKisToken();
	const promises = investments.map(i => getKisQuoteKorea(accessToken, i.googleSymbol));
	const results = await Promise.all(promises);

	await stockDB.insertStock({
		...kospiResponse,
		date: moment().tz('Asia/Seoul').format('YYYY-MM-DD'),
		data: kospiResponse.data.map((i) => {
			const foundResult = results.find(j => j.googleSymbol === i.googleSymbol);
			const priceString = foundResult?.output?.stck_prpr;
			const rateString = foundResult?.output?.prdy_ctrt;
			if (priceString) {
				return {
					...i,
					price: parseInt(priceString, 10),
					rate: parseFloat(rateString)
				};
			} else {
				return i;
			}
		})
	});
};

const arrangeUSInvestmemt = async () => {
	const allAccounts = await accountDB.listAccounts();
	const usResponse = await stockDB.getStock('us');
	const investments  = getInvestmentsFromAccounts(usResponse.data, allAccounts).filter(i => i.quantity > 0);
	const accessToken = await getKisToken();
	const promises = investments.map(i => getKisQuoteUS(accessToken, i.googleSymbol));
	const results = await Promise.all(promises);

	await stockDB.insertStock({
		...usResponse,
		date: moment().tz('America/Los_Angeles').format('YYYY-MM-DD'),
		data: usResponse.data.map((i) => {
			const foundResult = results.find(j => j.googleSymbol === i.googleSymbol);
			const priceString = foundResult?.output?.last;
			const rateString = foundResult?.output?.rate;
			if (priceString) {
				return {
					...i,
					price: parseFloat(priceString),
					rate: parseFloat(rateString)
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