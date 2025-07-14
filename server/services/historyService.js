const moment = require('moment-timezone');
const { stocksDB, transactionsDB } = require('../db');
const historyDB = require('../db/historyDB');
const { getClosePriceWithHistory, getInvestmentsFromTransactions } = require('../utils/investment');

const updateHistories = async (investments, allTransactions, timezone) => {
	const oldHistories = await historyDB.listHistories();
	const investmentNames = new Set(investments.map(inv => inv.name));

	const newHistories = oldHistories.map(history => {
		if (investmentNames.has(history.name)) {
			return {
				...history,
				data: [
					{
						date: `${moment().tz(timezone).subtract(1, 'days').format('YYYY-MM-DD')}T18:00:00.000Z`,
						close: getClosePriceWithHistory(investments, history)
					},
					...history.data
				].reduce((accumulator, currentValue) => {
					if (!accumulator.find(item => item.date === currentValue.date && item.close === currentValue.close)) {
						accumulator.push(currentValue);
					}
					return accumulator;
				}, [])
			};
		}
		return history;
	});
	await historyDB.bulkDocs(newHistories);
	const newInvestments = getInvestmentsFromTransactions(investments, allTransactions).filter(i => investmentNames.has(i.name) && !newHistories.find(j => j.name === i.name)).map(i => ({
		...i,
		data: [
			{
				date: `${moment().tz(timezone).subtract(1, 'days').format('YYYY-MM-DD')}T18:00:00.000Z`,
				close: getClosePriceWithHistory(investments, i)
			}
		]
	}));
	newInvestments.length && await historyDB.bulkDocs(newInvestments);
};

const arrangeUSHistorical = async () => {
	console.log('arrangeUSHistorical start', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));
	const transactionsResponse = await transactionsDB.list({ include_docs: true });
	const allTransactions = transactionsResponse.rows.map(i => i.doc);
	const usResponse = await stocksDB.get('us');
	await updateHistories(usResponse.data, allTransactions, 'America/Los_Angeles');
	console.log('arrangeUSHistorical done', moment().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss'));
};

const arrangeKRHistorical = async () => {
	console.log('arrangeKRHistorical start', moment().tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss'));
	const transactionsResponse = await transactionsDB.list({ include_docs: true });
	const allTransactions = transactionsResponse.rows.map(i => i.doc);
	const kospiResponse = await stocksDB.get('kospi');
	const kosdaqResponse = await stocksDB.get('kosdaq');
	const investments = [...kospiResponse.data, ...kosdaqResponse.data];
	await updateHistories(investments, allTransactions, 'Asia/Seoul');
	console.log('arrangeKRHistorical done', moment().tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss'));
};

module.exports = {
	arrangeUSHistorical,
	arrangeKRHistorical
};