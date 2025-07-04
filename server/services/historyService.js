const moment = require('moment-timezone');
const { stocksDB, transactionsDB } = require('../db');
const historyDB = require('../db/historyDB');
const { getClosePriceWithHistory, getInvestmentsFromTransactions } = require('../utils/investment');

const arrangeHistorical = async () => {
	console.log('arrangeHistorical start', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));
	const transactionsResponse = await transactionsDB.list({ include_docs: true });
	const allTransactions = transactionsResponse.rows.map(i => i.doc);
	const kospiResponse = await stocksDB.get('kospi');
	const kosdaqResponse = await stocksDB.get('kosdaq');
	const usResponse = await stocksDB.get('us');
	const investments = [...kospiResponse.data, ...kosdaqResponse.data, ...usResponse.data];
	const oldHistories = await historyDB.listHistories();
	const newHistories = oldHistories.map(i => ({
		...i,
		data: [
			{
				date: `${moment().tz('Asia/Seoul').subtract(1, 'days').format('YYYY-MM-DD')}T18:00:00.000Z`,
				close: getClosePriceWithHistory(investments, i)
			},
			...i.data
		].reduce((accumulator, currentValue) => {
			if (!accumulator.find(i => i.date === currentValue.date && i.close === currentValue.close)) {
				accumulator.push(currentValue);
			}
			return accumulator;
		}, [])
	}));
	await historyDB.bulkDocs(newHistories);
	const newInvestments = getInvestmentsFromTransactions(investments, allTransactions).filter(i => !newHistories.find(j => j.name === i.name)).map(i => ({
		...i,
		data: [
			{
				date: `${moment().tz('Asia/Seoul').subtract(1, 'days').format('YYYY-MM-DD')}T18:00:00.000Z`,
				close: getClosePriceWithHistory(investments, i)
			}
		]
	}));
	await historyDB.bulkDocs(newInvestments);
	console.log('arrangeHistorical done', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));
};

module.exports = {
	arrangeHistorical
};