const https = require('https');

const unzipper = require('unzipper');
const iconv = require('iconv-lite');

const stockDB = require('../db/stockDB');

const KIS_CDN_BASE = 'https://new.real.download.dws.co.kr/common/master';

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

// KOSPI Part2 = 228 bytes, KOSDAQ Part2 = 222 bytes
const parseKoreanMst = async (buffer, part2Length) => {
	const stocks = [];
	const directory = await unzipper.Open.buffer(buffer);
	const file = directory.files[0];
	const content = await file.buffer();
	const decoded = iconv.decode(content, 'cp949');
	const lines = decoded.split('\n');

	for (const line of lines) {
		if (!line.trim()) continue;

		const part1 = line.slice(0, line.length - part2Length);
		const shortCode = part1.slice(0, 9).trim();	// 단축코드 (6자리 종목코드)
		const koreanName = part1.slice(21).trim();		// 한글명

		if (!shortCode || !koreanName) continue;
		// 6자리 숫자 코드만 (정상 종목)
		if (!/^\d{6}$/.test(shortCode)) continue;

		stocks.push({
			_id: `investment:${shortCode}`,
			name: koreanName,
			googleSymbol: `KRX:${shortCode}`,
			yahooSymbol: `${shortCode}.KS`
		});
	}

	return stocks;
};

const mergeWithExisting = (newStocks, existingData) => {
	const existingMap = {};
	(existingData || []).forEach(item => {
		if (item.googleSymbol) {
			existingMap[item.googleSymbol] = item;
		}
	});

	return newStocks.map(stock => {
		const existing = existingMap[stock.googleSymbol];
		if (existing) {
			return { ...stock, price: existing.price, rate: existing.rate };
		}
		return stock;
	});
};

const updateKRStockList = async () => {
	console.log('updateKRStockList started');

	const [kospiBuffer, kosdaqBuffer] = await Promise.all([
		downloadToBuffer(`${KIS_CDN_BASE}/kospi_code.mst.zip`),
		downloadToBuffer(`${KIS_CDN_BASE}/kosdaq_code.mst.zip`)
	]);

	const [kospiStocks, kosdaqStocks] = await Promise.all([
		parseKoreanMst(kospiBuffer, 228),
		parseKoreanMst(kosdaqBuffer, 222)
	]);

	console.log(`updateKRStockList: kospi=${kospiStocks.length}, kosdaq=${kosdaqStocks.length}`);

	let kospiDoc;
	try {
		kospiDoc = await stockDB.getStock('kospi');
	} catch (err) {
		kospiDoc = { _id: 'kospi', data: [] };
	}

	let kosdaqDoc;
	try {
		kosdaqDoc = await stockDB.getStock('kosdaq');
	} catch (err) {
		kosdaqDoc = { _id: 'kosdaq', data: [] };
	}

	const mergedKospi = mergeWithExisting(kospiStocks, kospiDoc.data);
	const mergedKosdaq = mergeWithExisting(kosdaqStocks, kosdaqDoc.data);

	await Promise.all([
		stockDB.insertStock({ ...kospiDoc, data: mergedKospi }),
		stockDB.insertStock({ ...kosdaqDoc, data: mergedKosdaq })
	]);

	console.log(`updateKRStockList done: kospi=${mergedKospi.length}, kosdaq=${mergedKosdaq.length}`);
	return { kospi: mergedKospi.length, kosdaq: mergedKosdaq.length };
};

module.exports = { updateKRStockList };
