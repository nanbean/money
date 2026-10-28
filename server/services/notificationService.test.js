const { addNotification, listNotifications, sendBalanceUpdateNotification } = require('./notificationService');
const { notificationsDB } = require('../db');
const messaging = require('./messaging');
const accountService = require('./accountService');
const settingService = require('./settingService');
const stockDB = require('../db/stockDB');

// Mock all external dependencies to isolate the service for unit testing.
jest.mock('../db', () => ({
	notificationsDB: {
		insert: jest.fn(),
		list: jest.fn()
	}
}));

jest.mock('./messaging', () => ({
	sendNotification: jest.fn()
}));

jest.mock('../db/stockDB', () => ({
	getStock: jest.fn()
}));

jest.mock('./accountService', () => ({
	getAllAccounts: jest.fn()
}));

jest.mock('./settingService', () => ({
	getExchangeRate: jest.fn(),
	getCurrency: jest.fn()
}));

describe('notificationService', () => {
	// Before each test, clear all mock call history to ensure tests are independent.
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('addNotification', () => {
		test('should call notificationsDB.insert with the correct notification object', async () => {
			// Arrange: Define a sample notification.
			const mockNotification = { text: 'Test notification', timestamp: new Date() };
			
			// Act: Call the function to be tested.
			await addNotification(mockNotification);
			
			// Assert: Verify that the database insert method was called with the exact same object.
			expect(notificationsDB.insert).toHaveBeenCalledWith(mockNotification);
			expect(notificationsDB.insert).toHaveBeenCalledTimes(1);
		});
	});

	describe('listNotifications', () => {
		test('최신순 그대로, 화면이 쓰는 필드를 모두 돌려준다', async () => {
			// Arrange: DB 는 최신순(descending)으로 준다.
			const tx = { date: '2026-10-22', amount: -8910, payee: '삼천리(주)' };
			notificationsDB.list.mockResolvedValue({
				rows: [
					{ doc: { _id: '2026-10-22:b', _rev: '1-x', packageName: 'ios.KBPay', title: 'KBPay', text: '승인', transaction: tx } },
					{ doc: { _id: '2026-10-21:a', _rev: '1-y', text: 'Notification 4' } }
				]
			});

			// Act
			const result = await listNotifications(3);

			// Assert: 순서를 뒤집지 않고, _id·packageName·transaction 을 남긴다(_rev 는 뺀다).
			expect(notificationsDB.list).toHaveBeenCalledWith({ include_docs: true, descending: true, limit: 3 });
			expect(result).toEqual([
				{ _id: '2026-10-22:b', packageName: 'ios.KBPay', title: 'KBPay', text: '승인', transaction: tx },
				{ _id: '2026-10-21:a', packageName: '', title: '', text: 'Notification 4', transaction: null }
			]);
		});

		test('should return an empty array if the database has no notifications', async () => {
			// Arrange: Mock an empty database response.
			notificationsDB.list.mockResolvedValue({ rows: [] });

			// Act: Request notifications.
			const result = await listNotifications(5);

			// Assert: The result should be an empty array.
			expect(notificationsDB.list).toHaveBeenCalledWith({ include_docs: true, descending: true, limit: 5 });
			expect(result).toEqual([]);
		});
	});

	describe('sendBalanceUpdateNotification', () => {
		test('should correctly calculate net worth and send a formatted notification', async () => {
			// Arrange: Set up mock accounts and exchange rate.
			const mockAccounts = [
				{ name: 'Wallet', balance: 1000, currency: 'KRW' },
				{ name: 'US Bank', balance: 500, currency: 'USD' },
				{ name: 'Brokerage', balance: 10000, currency: 'KRW' },
				{ name: 'Broker_Cash', balance: 2000, currency: 'KRW' } // This account should be filtered out.
			];
			const mockExchangeRate = 1300;

			accountService.getAllAccounts.mockResolvedValue(mockAccounts);
			settingService.getExchangeRate.mockResolvedValue(mockExchangeRate);
			settingService.getCurrency.mockResolvedValue('KRW');

			// Act: Call the function.
			await sendBalanceUpdateNotification();

			// Assert: Verify the calculation and the final notification message.
			// Calculation: 1000 (KRW) + 10000 (KRW) + (500 (USD) * 1300) = 661,000
			const expectedNetWorth = (661000).toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' });

			expect(messaging.sendNotification).toHaveBeenCalledWith('NetWorth Update', `Today's NetWorth is ${expectedNetWorth}`, 'graph');
		});

		test('should correctly send a notification with a net worth of 0 if there are no accounts', async () => {
			// Arrange: Mock an empty array of accounts.
			accountService.getAllAccounts.mockResolvedValue([]);
			settingService.getExchangeRate.mockResolvedValue(1300);
			settingService.getCurrency.mockResolvedValue('KRW');

			// Act: Call the function.
			await sendBalanceUpdateNotification();

			// Assert: The net worth should be '0' and the notification sent correctly.
			const expectedNetWorth = (0).toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' });
			expect(messaging.sendNotification).toHaveBeenCalledWith('NetWorth Update', `Today's NetWorth is ${expectedNetWorth}`, 'graph');
		});
	
		describe('장 마감 상위 종목', () => {
			const STOCKS = {
				kospi: [
					{ name: '삼성전자', price: 72000, rate: 1.25 },
					{ name: 'SK하이닉스', price: 180000, rate: -0.5 },
					{ name: '카카오', price: 40000, rate: 0 }
				],
				kosdaq: [
					{ name: '에코프로', price: 100000, rate: 3.1 }
				],
				us: [
					{ name: 'TSLA', price: 250.12, rate: 0.21 },
					{ name: 'AAPL', price: 230, rate: -0.1 },
					{ name: 'NVDA', price: 140.5, rate: 2 }
				]
			};

			// 평가금액: 삼성전자 7,200,000 / SK하이닉스 3,600,000 / 카카오 4,000,000 / 에코프로 1,000,000
			//          TSLA 2,501.2 / AAPL 4,600 / NVDA 1,405
			const ACCOUNTS = [
				{ name: '키움', type: 'Invst', balance: 0, currency: 'KRW', investments: [
					{ name: '삼성전자', quantity: 60 },
					{ name: 'SK하이닉스', quantity: 20 },
					{ name: '카카오', quantity: 100 },
					{ name: '에코프로', quantity: 10 }
				] },
				{ name: 'NH', type: 'Invst', balance: 0, currency: 'KRW', investments: [
					{ name: '삼성전자', quantity: 40 }
				] },
				{ name: 'Schwab', type: 'Invst', balance: 0, currency: 'USD', investments: [
					{ name: 'TSLA', quantity: 10 },
					{ name: 'AAPL', quantity: 20 },
					{ name: 'NVDA', quantity: 10 }
				] },
				{ name: 'Wallet', type: 'Cash', balance: 1000, currency: 'KRW' }
			];

			const body = () => messaging.sendNotification.mock.calls[0][1];

			beforeEach(() => {
				accountService.getAllAccounts.mockResolvedValue(ACCOUNTS);
				settingService.getExchangeRate.mockResolvedValue(1300);
				settingService.getCurrency.mockResolvedValue('KRW');
				stockDB.getStock.mockImplementation(async (id) => ({ data: STOCKS[id] }));
			});

			test('한국장 마감에는 국내 종목 중 평가금액 상위 2개를 붙인다', async () => {
				// Act
				await sendBalanceUpdateNotification('KR');

				// Assert: 계좌를 합산한 평가금액 순 — 삼성전자(100주), 카카오
				const lines = body().split('\n');
				expect(lines).toHaveLength(3);
				expect(lines[0]).toMatch(/^Today's NetWorth is /);
				expect(lines[1]).toBe(`삼성전자 ${(72000).toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' })} (+1.25%)`);
				expect(lines[2]).toBe(`카카오 ${(40000).toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' })} (0.00%)`);
				expect(stockDB.getStock).not.toHaveBeenCalledWith('us');
			});

			test('미국장 마감에는 미국 종목을 달러 종가로 붙인다', async () => {
				// Act
				await sendBalanceUpdateNotification('US');

				// Assert
				const lines = body().split('\n');
				expect(lines.slice(1)).toEqual(['AAPL $230.00 (-0.10%)', 'TSLA $250.12 (+0.21%)']);
			});

			test('등락률이 없으면 종가만 붙인다', async () => {
				// Arrange
				stockDB.getStock.mockImplementation(async () => ({ data: [{ name: 'TSLA', price: 250.12 }] }));

				// Act
				await sendBalanceUpdateNotification('US');

				// Assert
				expect(body().split('\n').slice(1)).toEqual(['TSLA $250.12']);
			});

			test('시세를 못 읽어도 자산 알림은 보낸다', async () => {
				// Arrange
				jest.spyOn(console, 'error').mockImplementation(() => {});
				stockDB.getStock.mockImplementation(async () => { throw new Error('boom'); });

				// Act
				await sendBalanceUpdateNotification('KR');

				// Assert: getStock 실패는 빈 시세로 취급되어 종목 줄만 빠진다
				expect(body().split('\n')).toHaveLength(1);
				console.error.mockRestore();
			});
		});
	});
});