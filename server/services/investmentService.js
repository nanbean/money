const moment = require('moment-timezone');
const stockDB = require('../db/stockDB');
const accountDB = require('../db/accountDB');
const { getInvestmentsFromAccounts } = require('../utils/investment');
const { getKisToken, getKisQuoteKorea, getKisQuoteUS } = require('./kisConnector');

// Append today's price to weeklyPrices array, keep last 10 trading days
const updateWeeklyPrices = (existing = [], date, price) => {
	const filtered = existing.filter(p => p.date !== date);
	return [...filtered, { date, price }].slice(-10);
};

const arrangeKRInvestmemt = async () => {
	const allAccounts = await accountDB.listAccounts();
	const kospiResponse = await stockDB.getStock('kospi');
	const investments = getInvestmentsFromAccounts(kospiResponse.data, allAccounts).filter(i => i.quantity > 0);
	const accessToken = await getKisToken();
	const promises = investments.map(i => getKisQuoteKorea(accessToken, i.googleSymbol));
	const settled = await Promise.allSettled(promises);
	const results = settled.filter(r => r.status === 'fulfilled').map(r => r.value);
	settled.filter(r => r.status === 'rejected').forEach(r => console.error('getKisQuoteKorea failed:', r.reason));

	const krDate = moment().tz('Asia/Seoul').format('YYYY-MM-DD');
	await stockDB.insertStock({
		...kospiResponse,
		date: krDate,
		data: kospiResponse.data.map((i) => {
			const foundResult = results.find(j => j.googleSymbol === i.googleSymbol);
			const priceString = foundResult?.output?.stck_prpr;
			const rateString = foundResult?.output?.prdy_ctrt;
			if (priceString) {
				const price = parseInt(priceString, 10);
				return {
					...i,
					price,
					rate: parseFloat(rateString),
					weeklyPrices: updateWeeklyPrices(i.weeklyPrices, krDate, price)
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
	const settled = await Promise.allSettled(promises);
	const results = settled.filter(r => r.status === 'fulfilled').map(r => r.value);
	settled.filter(r => r.status === 'rejected').forEach(r => console.error('getKisQuoteUS failed:', r.reason));

	const usDate = moment().tz('America/Los_Angeles').format('YYYY-MM-DD');
	await stockDB.insertStock({
		...usResponse,
		date: usDate,
		data: usResponse.data.map((i) => {
			const foundResult = results.find(j => j.googleSymbol === i.googleSymbol);
			const priceString = foundResult?.output?.last;
			const rateString = foundResult?.output?.rate;
			if (priceString) {
				const price = parseFloat(priceString);
				return {
					...i,
					price,
					rate: parseFloat(rateString),
					weeklyPrices: updateWeeklyPrices(i.weeklyPrices, usDate, price)
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