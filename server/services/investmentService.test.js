const { arrangeKRInvestmemt, arrangeUSInvestmemt } = require('./investmentService');
const { accountsDB, stocksDB } = require('../db');
const tossConnector = require('./tossConnector');
const moment = require('moment-timezone');

// Mock dependencies
jest.mock('../db', () => ({
	// We need to define all functions that might be called in the module
	accountsDB: {
		list: jest.fn()
	},
	stocksDB: {
		get: jest.fn(),
		insert: jest.fn()
	}
}));

jest.mock('./tossConnector', () => ({
	getTossPrices: jest.fn(),
	getTossKrPreviousClose: jest.fn(),
	getTossPreviousClose: jest.fn(),
	// 실제 구현과 동일하게 (item, value, error) 형태로 돌려주되 대기시간은 없앤다.
	mapWithRateLimit: jest.fn(async (items, fn) => {
		const out = [];
		for (const item of items) {
			try {
				out.push({ item, value: await fn(item), error: null });
			} catch (error) {
				out.push({ item, value: null, error });
			}
		}
		return out;
	})
}));

describe('investmentService', () => {
	// Before each test, clear all mock call history to ensure tests are independent.
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('arrangeKRInvestmemt', () => {
		test('should fetch prices in one batch and update the stocks database correctly', async () => {
			// Arrange
			const mockAccounts = {
				rows: [{
					doc: {
						investments: [
							{ name: 'Samsung Electronics', quantity: 10 },
							{ name: 'SK Hynix', quantity: 5 }
						]
					}
				}]
			};

			const mockKospiDB = {
				_rev: '1-abc',
				data: [
					{ name: 'Samsung Electronics', googleSymbol: 'KRX:005930', price: 70000 },
					{ name: 'SK Hynix', googleSymbol: 'KRX:000660', price: 130000 },
					{ name: 'LG Chem', googleSymbol: 'KRX:051910', price: 400000 } // Not in accounts, should not be fetched
				]
			};

			accountsDB.list.mockResolvedValue(mockAccounts);
			stocksDB.get.mockResolvedValue(mockKospiDB);
			tossConnector.getTossPrices.mockResolvedValue(new Map([
				['005930', { symbol: '005930', lastPrice: 75000, currency: 'KRW' }],
				['000660', { symbol: '000660', lastPrice: 135000, currency: 'KRW' }]
			]));
			tossConnector.getTossKrPreviousClose.mockImplementation(async (symbol) => {
				if (symbol === '005930') return 70000;
				if (symbol === '000660') return 130000;
				return null;
			});

			// Act
			await arrangeKRInvestmemt();

			// Assert
			// 1. Prices are fetched in a single multi-symbol call, only for held stocks
			expect(tossConnector.getTossPrices).toHaveBeenCalledTimes(1);
			expect(tossConnector.getTossPrices).toHaveBeenCalledWith(['005930', '000660']);

			// 2. Check if stocksDB.insert was called with the updated data
			expect(stocksDB.insert).toHaveBeenCalledTimes(1);
			const insertedData = stocksDB.insert.mock.calls[0][0];
			const krDate = moment().tz('Asia/Seoul').format('YYYY-MM-DD');

			expect(insertedData.date).toBe(krDate);
			expect(insertedData.data).toHaveLength(3);

			// 3. Verify the prices were updated correctly
			const samsung = insertedData.data.find(s => s.name === 'Samsung Electronics');
			const skHynix = insertedData.data.find(s => s.name === 'SK Hynix');
			const lgChem = insertedData.data.find(s => s.name === 'LG Chem');

			expect(samsung.price).toBe(75000); // Updated
			expect(skHynix.price).toBe(135000); // Updated
			expect(lgChem.price).toBe(400000); // Unchanged

			// 4. Rate is derived from the previous close, and the close is cached by date
			expect(samsung.rate).toBe(7.14); // rounded to 2dp like KIS prdy_ctrt
			expect(samsung.prevClose).toBe(70000);
			expect(samsung.prevCloseDate).toBe(krDate);
			expect(skHynix.rate).toBe(3.85);
		});

		test('should reuse the cached previous close instead of refetching on the same day', async () => {
			// Arrange
			const krDate = moment().tz('Asia/Seoul').format('YYYY-MM-DD');
			accountsDB.list.mockResolvedValue({
				rows: [{ doc: { investments: [{ name: 'Samsung Electronics', quantity: 10 }] } }]
			});
			stocksDB.get.mockResolvedValue({
				_rev: '1-abc',
				data: [{
					name: 'Samsung Electronics',
					googleSymbol: 'KRX:005930',
					price: 70000,
					prevClose: 70000,
					prevCloseDate: krDate
				}]
			});
			tossConnector.getTossPrices.mockResolvedValue(new Map([
				['005930', { symbol: '005930', lastPrice: 71400, currency: 'KRW' }]
			]));

			// Act
			await arrangeKRInvestmemt();

			// Assert
			expect(tossConnector.getTossKrPreviousClose).not.toHaveBeenCalled();
			const samsung = stocksDB.insert.mock.calls[0][0].data[0];
			expect(samsung.price).toBe(71400);
			expect(samsung.rate).toBe(2);
		});

		test('should keep the existing rate when the previous close cannot be resolved', async () => {
			// Arrange
			accountsDB.list.mockResolvedValue({
				rows: [{ doc: { investments: [{ name: 'Samsung Electronics', quantity: 10 }] } }]
			});
			stocksDB.get.mockResolvedValue({
				_rev: '1-abc',
				data: [{ name: 'Samsung Electronics', googleSymbol: 'KRX:005930', price: 70000, rate: 1.23 }]
			});
			tossConnector.getTossPrices.mockResolvedValue(new Map([
				['005930', { symbol: '005930', lastPrice: 75000, currency: 'KRW' }]
			]));
			tossConnector.getTossKrPreviousClose.mockRejectedValue(new Error('price-limits failed'));

			// Act
			await arrangeKRInvestmemt();

			// Assert — price still updates, rate falls back to the stored value
			const samsung = stocksDB.insert.mock.calls[0][0].data[0];
			expect(samsung.price).toBe(75000);
			expect(samsung.rate).toBe(1.23);
			expect(samsung.prevCloseDate).toBeUndefined();
		});

		test('should leave a stock untouched when the quote is missing', async () => {
			// Arrange
			accountsDB.list.mockResolvedValue({
				rows: [{ doc: { investments: [{ name: 'Samsung Electronics', quantity: 10 }] } }]
			});
			stocksDB.get.mockResolvedValue({
				_rev: '1-abc',
				data: [{ name: 'Samsung Electronics', googleSymbol: 'KRX:005930', price: 70000, rate: 1.23 }]
			});
			tossConnector.getTossPrices.mockResolvedValue(new Map());
			tossConnector.getTossKrPreviousClose.mockResolvedValue(null);

			// Act
			await arrangeKRInvestmemt();

			// Assert
			const samsung = stocksDB.insert.mock.calls[0][0].data[0];
			expect(samsung.price).toBe(70000);
			expect(samsung.weeklyPrices).toBeUndefined();
		});
	});

	describe('arrangeUSInvestmemt', () => {
		test('should fetch US stock prices and update the database correctly', async () => {
			// Arrange
			const mockAccounts = {
				rows: [{
					doc: {
						investments: [
							{ name: 'Apple', quantity: 10 },
							{ name: 'Tesla', quantity: 20 }
						]
					}
				}]
			};

			const mockUsDB = {
				_rev: '1-xyz',
				data: [
					{ name: 'Apple', googleSymbol: 'NASDAQ:AAPL', price: 170.00 },
					{ name: 'Tesla', googleSymbol: 'NASDAQ:TSLA', price: 250.00 },
					{ name: 'Microsoft', googleSymbol: 'NASDAQ:MSFT', price: 300.00 } // Not in accounts
				]
			};

			accountsDB.list.mockResolvedValue(mockAccounts);
			stocksDB.get.mockResolvedValue(mockUsDB);
			tossConnector.getTossPrices.mockResolvedValue(new Map([
				['AAPL', { symbol: 'AAPL', lastPrice: 175.50, currency: 'USD' }],
				['TSLA', { symbol: 'TSLA', lastPrice: 245.25, currency: 'USD' }]
			]));
			tossConnector.getTossPreviousClose.mockImplementation(async (symbol) => {
				if (symbol === 'AAPL') return 170.00;
				if (symbol === 'TSLA') return 250.00;
				return null;
			});

			// Act
			await arrangeUSInvestmemt();

			// Assert
			// 1. Prices are fetched in a single multi-symbol call, only for held stocks
			expect(tossConnector.getTossPrices).toHaveBeenCalledTimes(1);
			expect(tossConnector.getTossPrices).toHaveBeenCalledWith(['AAPL', 'TSLA']);

			// 2. Check if stocksDB.insert was called with the updated data
			expect(stocksDB.insert).toHaveBeenCalledTimes(1);
			const insertedData = stocksDB.insert.mock.calls[0][0];

			expect(insertedData.date).toBe(moment().tz('America/Los_Angeles').format('YYYY-MM-DD'));
			expect(insertedData.data).toHaveLength(3);

			// 3. Verify the prices were updated correctly (fractional prices preserved)
			expect(insertedData.data.find(s => s.name === 'Apple').price).toBe(175.50); // Updated
			expect(insertedData.data.find(s => s.name === 'Tesla').price).toBe(245.25); // Updated
			expect(insertedData.data.find(s => s.name === 'Microsoft').price).toBe(300.00); // Unchanged

			// 4. Rate reflects the move against the previous close
			expect(insertedData.data.find(s => s.name === 'Apple').rate).toBe(3.24);
			expect(insertedData.data.find(s => s.name === 'Tesla').rate).toBe(-1.9);

			// 5. US uses daily candles; the KRX price-limits path is KR-only
			expect(tossConnector.getTossPreviousClose).toHaveBeenCalledWith('AAPL', 'America/Los_Angeles');
			expect(tossConnector.getTossKrPreviousClose).not.toHaveBeenCalled();
		});
	});
});
