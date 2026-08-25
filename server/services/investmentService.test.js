const { arrangeKRInvestmemt, arrangeUSInvestmemt } = require('./investmentService');
const { accountsDB, stocksDB } = require('../db');
const tossConnector = require('./tossConnector');
const marketHours = require('../utils/marketHours');
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

// 정규장 여부는 벽시계에 의존하므로 테스트에서 직접 제어한다.
jest.mock('../utils/marketHours', () => ({
	isKrRegularSession: jest.fn()
}));

describe('investmentService', () => {
	// Before each test, clear all mock call history to ensure tests are independent.
	beforeEach(() => {
		jest.clearAllMocks();
		// 기본은 정규장. 장외 동작은 해당 테스트에서 false 로 바꾼다.
		marketHours.isKrRegularSession.mockReturnValue(true);
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
			expect(tossConnector.getTossPreviousClose).toHaveBeenCalledWith('AAPL');
			expect(tossConnector.getTossKrPreviousClose).not.toHaveBeenCalled();
		});

		// 한국장 마감 크론이 미국 종목도 함께 갱신한다. 그때 미국은 닫혀 있어
		// 애프터마켓 값이 들어오는데, 이는 의도된 동작이므로 게이트하지 않는다.
		test('미국장이 닫혀 있어도 갱신한다 (장외 등락률 허용)', async () => {
			accountsDB.list.mockResolvedValue({
				rows: [{ doc: { investments: [{ name: 'Apple', quantity: 10 }] } }]
			});
			stocksDB.get.mockResolvedValue({
				_rev: '1-xyz',
				data: [{ name: 'Apple', googleSymbol: 'NASDAQ:AAPL', price: 175.5, rate: 3.24 }]
			});
			tossConnector.getTossPrices.mockResolvedValue(new Map([
				['AAPL', { symbol: 'AAPL', lastPrice: 176.2, currency: 'USD' }]
			]));
			tossConnector.getTossPreviousClose.mockResolvedValue(170.0);

			await arrangeUSInvestmemt();

			const apple = stocksDB.insert.mock.calls[0][0].data[0];
			expect(apple.price).toBe(176.2);
			expect(apple.rate).toBe(3.65);
		});
	});

	// 토스 lastPrice 는 장이 닫히면 시간외 체결가로 바뀐다. 그걸로 등락률을 다시
	// 계산하면 홈 Stock List 에 장외 등락률이 찍히므로, 장외에는 정규장 종가를 지킨다.
	describe('정규장이 아닐 때', () => {
		const heldOneStock = () => {
			accountsDB.list.mockResolvedValue({
				rows: [{ doc: { investments: [{ name: 'Samsung Electronics', quantity: 10 }] } }]
			});
		};

		test('KR: 정규장 종가와 등락률을 시간외 체결가로 덮어쓰지 않는다', async () => {
			// Arrange — 정규장 종가 71,400 / 등락률 +2.0 이 이미 기록돼 있다
			marketHours.isKrRegularSession.mockReturnValue(false);
			heldOneStock();
			stocksDB.get.mockResolvedValue({
				_rev: '1-abc',
				data: [{
					name: 'Samsung Electronics',
					googleSymbol: 'KRX:005930',
					price: 71400,
					rate: 2,
					prevClose: 70000
				}]
			});

			// Act
			await arrangeKRInvestmemt();

			// Assert — 조회도 쓰기도 하지 않는다
			expect(tossConnector.getTossPrices).not.toHaveBeenCalled();
			expect(tossConnector.getTossKrPreviousClose).not.toHaveBeenCalled();
			expect(stocksDB.insert).not.toHaveBeenCalled();
		});

		test('가격이 아직 없는 종목은 장외에도 채운다', async () => {
			// 신규 편입 종목이 개장까지 빈칸으로 남지 않도록 하는 예외.
			marketHours.isKrRegularSession.mockReturnValue(false);
			accountsDB.list.mockResolvedValue({
				rows: [{
					doc: {
						investments: [
							{ name: 'Samsung Electronics', quantity: 10 },
							{ name: 'SK Hynix', quantity: 5 }
						]
					}
				}]
			});
			stocksDB.get.mockResolvedValue({
				_rev: '1-abc',
				data: [
					{ name: 'Samsung Electronics', googleSymbol: 'KRX:005930', price: 71400, rate: 2 },
					{ name: 'SK Hynix', googleSymbol: 'KRX:000660' } // 가격 없음
				]
			});
			tossConnector.getTossPrices.mockResolvedValue(new Map([
				['005930', { symbol: '005930', lastPrice: 72000, currency: 'KRW' }],
				['000660', { symbol: '000660', lastPrice: 135000, currency: 'KRW' }]
			]));
			tossConnector.getTossKrPreviousClose.mockResolvedValue(130000);

			await arrangeKRInvestmemt();

			const inserted = stocksDB.insert.mock.calls[0][0].data;
			const samsung = inserted.find(s => s.name === 'Samsung Electronics');
			const skHynix = inserted.find(s => s.name === 'SK Hynix');

			// 이미 정규장 종가가 있던 종목은 그대로
			expect(samsung.price).toBe(71400);
			expect(samsung.rate).toBe(2);
			// 비어 있던 종목만 채워진다
			expect(skHynix.price).toBe(135000);
			expect(skHynix.rate).toBe(3.85);
		});
	});
});
