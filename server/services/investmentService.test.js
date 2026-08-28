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
			// 이제 { close, sessionDate } 를 돌려준다.
			const etToday = moment().tz('America/New_York').format('YYYY-MM-DD');
			tossConnector.getTossPreviousClose.mockImplementation(async (symbol) => {
				if (symbol === 'AAPL') return { close: 170.00, sessionDate: etToday };
				if (symbol === 'TSLA') return { close: 250.00, sessionDate: etToday };
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

			// 기준일은 거래소 시간대(ET)다. getTossPreviousClose 가 일봉 세션일을
			// ET 로 판정하므로 여기서도 맞춰야 한다.
			expect(insertedData.date).toBe(moment().tz('America/New_York').format('YYYY-MM-DD'));
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

		// ET 자정은 지났지만 PT 자정은 아직 안 온 3시간(21:00~24:00 PT).
		// 기준일을 PT 로 잡던 때는 이 구간에서 저장된 prevCloseDate 가 '오늘'로
		// 판정되어 전일 종가를 다시 받지 않았다. 가격만 새 세션 값으로 갱신되고
		// prevClose 는 이틀 전 종가에 묶여, 등락률이 이틀치를 섞어 나왔다.
		describe('ET 는 넘어갔지만 PT 는 안 넘어간 시각', () => {
			// 2026-08-27 00:02 ET = 2026-08-26 21:02 PT
			const atGapWindow = () => {
				jest.useFakeTimers();
				jest.setSystemTime(moment.tz('2026-08-27 00:02', 'America/New_York').valueOf());
			};

			afterEach(() => {
				jest.useRealTimers();
			});

			const storedTsla = (prevCloseDate) => ({
				_rev: '1-xyz',
				data: [{
					name: 'TSLA',
					googleSymbol: 'NASDAQ:TSLA',
					price: 346.8,
					rate: -0.99,
					prevClose: 350.25,       // 08-25 종가
					prevCloseDate
				}]
			});

			beforeEach(() => {
				accountsDB.list.mockResolvedValue({
					rows: [{ doc: { investments: [{ name: 'TSLA', quantity: 10 }] } }]
				});
				tossConnector.getTossPrices.mockResolvedValue(new Map([
					['TSLA', { symbol: 'TSLA', lastPrice: 346.55, currency: 'USD' }]
				]));
				// 08-26 종가 · 진행 중인 세션은 08-27
				tossConnector.getTossPreviousClose.mockResolvedValue({
					close: 345.82,
					sessionDate: '2026-08-27'
				});
			});

			test('기준일은 ET 날짜다', async () => {
				atGapWindow();
				stocksDB.get.mockResolvedValue(storedTsla('2026-08-26'));

				await arrangeUSInvestmemt();

				expect(stocksDB.insert.mock.calls[0][0].date).toBe('2026-08-27');
			});

			test('전일 종가를 다시 받아 등락률을 새 기준으로 계산한다', async () => {
				atGapWindow();
				stocksDB.get.mockResolvedValue(storedTsla('2026-08-26'));

				await arrangeUSInvestmemt();

				// PT 기준이던 때는 '오늘 것'으로 보고 건너뛰었다
				expect(tossConnector.getTossPreviousClose).toHaveBeenCalledWith('TSLA');

				const tsla = stocksDB.insert.mock.calls[0][0].data[0];
				expect(tsla.prevClose).toBe(345.82);
				expect(tsla.prevCloseDate).toBe('2026-08-27');
				// (346.55 - 345.82) / 345.82 = +0.21%  (예전에는 350.25 대비 -1.06%)
				expect(tsla.rate).toBe(0.21);
			});

			// US 는 캐시하지 않는다. 야간에는 세션일이 달력 날짜보다 앞서서 날짜 비교로
			// 신선도를 판정할 수 없기 때문이다 — 캐시했을 때 등락률이 멈추던 원인.
			test('prevCloseDate 가 오늘이어도 다시 받는다', async () => {
				atGapWindow();
				stocksDB.get.mockResolvedValue(storedTsla('2026-08-27'));

				await arrangeUSInvestmemt();

				expect(tossConnector.getTossPreviousClose).toHaveBeenCalledWith('TSLA');
				const tsla = stocksDB.insert.mock.calls[0][0].data[0];
				expect(tsla.prevClose).toBe(345.82);
				expect(tsla.rate).toBe(0.21);
			});

			test('weeklyPrices 는 ET 세션일로 기록한다', async () => {
				atGapWindow();
				stocksDB.get.mockResolvedValue(storedTsla('2026-08-26'));

				await arrangeUSInvestmemt();

				const tsla = stocksDB.insert.mock.calls[0][0].data[0];
				// 야간 세션 가격이 전날(08-26) 종가 칸을 덮어쓰면 안 된다
				expect(tsla.weeklyPrices).toEqual([{ date: '2026-08-27', price: 346.55 }]);
			});
		});

		// 토스는 야간 세션(20:00 ET~)을 다음 거래일로 집계한다. 달력 날짜로 기준을
		// 잡던 때는 이 구간에서 prevClose 가 한 세션 뒤져, 등락률이 직전 정규장
		// 등락률에 붙어 움직이지 않는 것처럼 보였다. 실측 재현 케이스.
		describe('야간 세션 (세션일이 달력 날짜보다 앞선 시각)', () => {
			// 2026-08-27 21:28 ET — 달력은 08-27, 진행 중인 세션은 08-28
			const atOvernight = () => {
				jest.useFakeTimers();
				jest.setSystemTime(moment.tz('2026-08-27 21:28', 'America/New_York').valueOf());
			};

			afterEach(() => {
				jest.useRealTimers();
			});

			beforeEach(() => {
				accountsDB.list.mockResolvedValue({
					rows: [{ doc: { investments: [{ name: 'TSLA', quantity: 10 }] } }]
				});
				stocksDB.get.mockResolvedValue({
					_rev: '1-xyz',
					data: [{
						name: 'TSLA',
						googleSymbol: 'NASDAQ:TSLA',
						price: 354.86,
						rate: 2.61,            // 08-27 정규장 등락률
						prevClose: 345.82,     // 08-26 종가
						prevCloseDate: '2026-08-27'
					}]
				});
				tossConnector.getTossPrices.mockResolvedValue(new Map([
					['TSLA', { symbol: 'TSLA', lastPrice: 354.55, currency: 'USD' }]
				]));
				// 진행 중인 세션은 08-28, 그 직전 종가는 08-27 의 354.81
				tossConnector.getTossPreviousClose.mockResolvedValue({
					close: 354.81,
					sessionDate: '2026-08-28'
				});
			});

			test('직전 거래일 종가를 기준으로 야간 등락률을 계산한다', async () => {
				atOvernight();

				await arrangeUSInvestmemt();

				const tsla = stocksDB.insert.mock.calls[0][0].data[0];
				expect(tsla.price).toBe(354.55);
				expect(tsla.prevClose).toBe(354.81);
				// (354.55 - 354.81) / 354.81 = -0.07%
				// 예전에는 345.82 를 기준으로 잡아 +2.52% (= 정규장 값 +2.60% 에 붙음)
				expect(tsla.rate).toBe(-0.07);
			});

			test('prevCloseDate 는 진행 중인 세션일을 담는다', async () => {
				atOvernight();

				await arrangeUSInvestmemt();

				const tsla = stocksDB.insert.mock.calls[0][0].data[0];
				expect(tsla.prevCloseDate).toBe('2026-08-28');
			});

			test('weeklyPrices 는 세션일(08-28)에 기록해 전날 종가를 덮지 않는다', async () => {
				atOvernight();

				await arrangeUSInvestmemt();

				const tsla = stocksDB.insert.mock.calls[0][0].data[0];
				expect(tsla.weeklyPrices).toEqual([{ date: '2026-08-28', price: 354.55 }]);
			});

			test('문서 date 는 달력 날짜(ET)를 유지한다', async () => {
				atOvernight();

				await arrangeUSInvestmemt();

				expect(stocksDB.insert.mock.calls[0][0].date).toBe('2026-08-27');
			});
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
			tossConnector.getTossPreviousClose.mockResolvedValue({
				close: 170.0,
				sessionDate: moment().tz('America/New_York').format('YYYY-MM-DD')
			});

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
