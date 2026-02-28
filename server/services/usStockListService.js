const https = require('https');

const unzipper = require('unzipper');
const iconv = require('iconv-lite');

const stockDB = require('../db/stockDB');

const KIS_CDN_BASE = 'https://new.real.download.dws.co.kr/common/master';

const EXCHANGE_MAP = {
	'NAS': 'NASDAQ',
	'NYS': 'NYSE',
	'AMS': 'NYSEARCA'
};

const downloadToBuffer = (url) => {
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			if (res.statusCode !== 200) {
				reject(new Error(`HTTP ${res.statusCode} for ${url}`));
				return;
			}
			const chunks = [];
			res.on('data', (chunk) => chunks.push(chunk));
			res.on('end', () => resolve(Buffer.concat(chunks)));
			res.on('error', reject);
		}).on('error', reject);
	});
};

const parseOverseasMst = async (buffer) => {
	const stocks = [];
	const directory = await unzipper.Open.buffer(buffer);
	const file = directory.files[0];
	const content = await file.buffer();
	const decoded = iconv.decode(content, 'cp949');
	const lines = decoded.split('\n');

	for (const line of lines) {
		if (!line.trim()) continue;
		const fields = line.split('\t');
		if (fields.length < 9) continue;

		const exchangeCode = fields[2]?.trim();
		const symbol = fields[4]?.trim();
		const securityType = fields[8]?.trim();

		// Security type 2 = Stock, 3 = ETP(ETF) (exclude Index=1, Warrant=4)
		if (securityType !== '2' && securityType !== '3') continue;
		if (!symbol || !exchangeCode) continue;

		const exchange = EXCHANGE_MAP[exchangeCode];
		if (!exchange) continue;

		// Filter to normal symbols only (1-5 uppercase letters, no dot/dash)
		if (!/^[A-Z]{1,5}$/.test(symbol)) continue;

		stocks.push({
			name: symbol,
			googleSymbol: `${exchange}:${symbol}`,
			yahooSymbol: symbol,
			currency: 'USD'
		});
	}

	return stocks;
};

const updateUSStockList = async () => {
	console.log('updateUSStockList started');

	const [nasBuffer, nysBuffer, amsBuffer] = await Promise.all([
		downloadToBuffer(`${KIS_CDN_BASE}/nasmst.cod.zip`),
		downloadToBuffer(`${KIS_CDN_BASE}/nysmst.cod.zip`),
		downloadToBuffer(`${KIS_CDN_BASE}/amsmst.cod.zip`)
	]);

	const [nasStocks, nysStocks, amsStocks] = await Promise.all([
		parseOverseasMst(nasBuffer),
		parseOverseasMst(nysBuffer),
		parseOverseasMst(amsBuffer)
	]);

	const newStocks = [...nasStocks, ...nysStocks, ...amsStocks];
	console.log(`updateUSStockList: downloaded ${newStocks.length} stocks`);

	let usDoc;
	try {
		usDoc = await stockDB.getStock('us');
	} catch (err) {
		usDoc = { _id: 'us', data: [] };
	}

	// Preserve existing price/rate for stocks that already exist
	const existingMap = {};
	(usDoc.data || []).forEach(item => {
		if (item.googleSymbol) {
			existingMap[item.googleSymbol] = item;
		}
	});

	const mergedData = newStocks.map(stock => {
		const existing = existingMap[stock.googleSymbol];
		if (existing) {
			return { ...stock, price: existing.price, rate: existing.rate };
		}
		return stock;
	});

	await stockDB.insertStock({
		...usDoc,
		data: mergedData
	});

	console.log(`updateUSStockList done: ${mergedData.length} stocks`);
	return mergedData.length;
};

module.exports = { updateUSStockList };
