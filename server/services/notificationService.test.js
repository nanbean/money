const { addNotification, listNotifications, sendBalanceUpdateNotification } = require('./notificationService');
const { notificationsDB } = require('../db');
const messaging = require('../messaging');
const accountService = require('./accountService');
const settingService = require('./settingService');

// Mock all external dependencies to isolate the service for unit testing.
jest.mock('../db', () => ({
	notificationsDB: {
		insert: jest.fn(),
		list: jest.fn()
	}
}));

jest.mock('../messaging', () => ({
	sendNotification: jest.fn()
}));

jest.mock('./accountService', () => ({
	getAllAccounts: jest.fn()
}));

jest.mock('./settingService', () => ({
	getExchangeRate: jest.fn()
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
		test('should return the last `size` notifications correctly', async () => {
			// Arrange: Create a mock database response with several notifications.
			const mockDbResponse = {
				rows: [
					{ doc: { text: 'Notification 1' } },
					{ doc: { text: 'Notification 2' } },
					{ doc: { text: 'Notification 3' } },
					{ doc: { text: 'Notification 4' } },
					{ doc: { text: 'Notification 5' } }
				]
			};
			notificationsDB.list.mockResolvedValue(mockDbResponse);

			// Act: Request the last 3 notifications.
			const result = await listNotifications(3);

			// Assert: Verify that the list method was called and the result is correctly sliced and mapped.
			expect(notificationsDB.list).toHaveBeenCalledWith({ include_docs: true });
			expect(result).toEqual(['Notification 3', 'Notification 4', 'Notification 5']);
		});

		test('should return all notifications if `size` is larger than the total number', async () => {
			// Arrange: Mock a response with fewer notifications than the requested size.
			const mockDbResponse = {
				rows: [
					{ doc: { text: 'Notification 1' } },
					{ doc: { text: 'Notification 2' } }
				]
			};
			notificationsDB.list.mockResolvedValue(mockDbResponse);

			// Act: Request 5 notifications.
			const result = await listNotifications(5);

			// Assert: The result should contain all available notifications.
			expect(result).toEqual(['Notification 1', 'Notification 2']);
		});

		test('should return an empty array if the database has no notifications', async () => {
			// Arrange: Mock an empty database response.
			notificationsDB.list.mockResolvedValue({ rows: [] });

			// Act: Request notifications.
			const result = await listNotifications(5);

			// Assert: The result should be an empty array.
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

			// Act: Call the function.
			await sendBalanceUpdateNotification();

			// Assert: Verify the calculation and the final notification message.
			// Calculation: 1000 (KRW) + 10000 (KRW) + (500 (USD) * 1300) = 661,000
			const expectedNetWorth = '661,000';

			expect(messaging.sendNotification).toHaveBeenCalledWith('NetWorth Update', `Today's NetWorth is ${expectedNetWorth}`, 'graph');
		});

		test('should correctly send a notification with a net worth of 0 if there are no accounts', async () => {
			// Arrange: Mock an empty array of accounts.
			accountService.getAllAccounts.mockResolvedValue([]);
			settingService.getExchangeRate.mockResolvedValue(1300);

			// Act: Call the function.
			await sendBalanceUpdateNotification();

			// Assert: The net worth should be '0' and the notification sent correctly.
			const expectedNetWorth = '0';
			expect(messaging.sendNotification).toHaveBeenCalledWith('NetWorth Update', `Today's NetWorth is ${expectedNetWorth}`, 'graph');
		});
	});
});