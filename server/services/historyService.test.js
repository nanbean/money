const { arrangeHistorical } = require('./historyService');
const { historiesDB, stocksDB, transactionsDB } = require('../db');

// Mock the entire db module
jest.mock('../db', () => ({
	historiesDB: {
		list: jest.fn(),
		bulk: jest.fn()
	},
	stocksDB: {
		get: jest.fn()
	},
	transactionsDB: {
		list: jest.fn()
	}
}));

describe('historyService', () => {
	describe('arrangeHistorical', () => {
		// A fixed date for deterministic tests
		const MOCK_TODAY = '2023-10-27T10:00:00.000Z';
		// The function calculates for the previous day, with a specific time for Asia/Seoul
		const MOCK_YESTERDAY_ISO = '2023-10-26T18:00:00.000Z';

		beforeEach(() => {
			// Clear all mocks before each test
			jest.clearAllMocks();
			// Use fake timers to control moment()
			jest.useFakeTimers();
			jest.setSystemTime(new Date(MOCK_TODAY));
			jest.spyOn(console, 'log').mockImplementation(() => {});
		});

		afterEach(() => {
			// Restore real timers
			jest.useRealTimers();
		});

		test('should update existing histories and add new ones', async () => {
			// Arrange: Mock DB responses for a scenario with one existing and one new investment
			transactionsDB.list.mockResolvedValue({
				rows: [
					{ doc: { accountId: 'account:Invst:Broker', investment: 'AAPL' } }, // Existing
					{ doc: { accountId: 'account:Invst:Broker', investment: 'GOOG' } } // New
				]
			});
			stocksDB.get.mockResolvedValue({
				data: [
					{ _id: 'investment:AAPL', name: 'AAPL', price: 170, yahooSymbol: 'AAPL' },
					{ _id: 'investment:GOOG', name: 'GOOG', price: 2800, yahooSymbol: 'GOOG' }
				]
			});
			historiesDB.list.mockResolvedValue({
				rows: [
					{ doc: { _id: 'history:AAPL', name: 'AAPL', data: [{ date: '2023-10-25T18:00:00.000Z', close: 165 }] } }
				]
			});
			historiesDB.bulk.mockResolvedValue([{}]); // Mock successful bulk insert

			// Act
			await arrangeHistorical();

			// Assert
			expect(historiesDB.bulk).toHaveBeenCalledTimes(2);

			// 1. Assert the update call for existing histories
			const firstBulkCallArgs = historiesDB.bulk.mock.calls[0][0].docs;
			expect(firstBulkCallArgs).toHaveLength(1);
			expect(firstBulkCallArgs[0]).toMatchObject({ _id: 'history:AAPL', name: 'AAPL' });
			expect(firstBulkCallArgs[0].data).toHaveLength(2);
			expect(firstBulkCallArgs[0].data[0]).toEqual({
				date: MOCK_YESTERDAY_ISO,
				close: 170 // Price from stocksDB mock
			});

			// 2. Assert the insert call for new histories
			const secondBulkCallArgs = historiesDB.bulk.mock.calls[1][0].docs;
			expect(secondBulkCallArgs).toHaveLength(1);
			expect(secondBulkCallArgs[0]).toMatchObject({ _id: 'history:GOOG', name: 'GOOG' });
			expect(secondBulkCallArgs[0].data).toHaveLength(1);
			expect(secondBulkCallArgs[0].data[0]).toEqual({
				date: MOCK_YESTERDAY_ISO,
				close: 2800 // Price from stocksDB mock
			});
		});

		test('should not add a duplicate date entry to an existing history', async () => {
			// Arrange: Mock a history that already contains an entry for yesterday
			transactionsDB.list.mockResolvedValue({
				rows: [{ doc: { accountId: 'account:Invst:Broker', investment: 'AAPL' } }]
			});
			stocksDB.get.mockResolvedValue({
				data: [{ _id: 'investment:AAPL', name: 'AAPL', price: 170, yahooSymbol: 'AAPL' }]
			});
			historiesDB.list.mockResolvedValue({
				rows: [
					{ doc: { _id: 'history:AAPL', name: 'AAPL', data: [{ date: MOCK_YESTERDAY_ISO, close: 170 }] } }
				]
			});
			historiesDB.bulk.mockResolvedValue([{}]);

			// Act
			await arrangeHistorical();

			// Assert
			expect(historiesDB.bulk).toHaveBeenCalledTimes(2);

			const firstBulkCallArgs = historiesDB.bulk.mock.calls[0][0].docs;
			expect(firstBulkCallArgs).toHaveLength(1);
			// The data array should still have only one entry due to de-duplication
			expect(firstBulkCallArgs[0].data).toHaveLength(1);
		});

		test('should handle case with no existing histories in the database', async () => {
			// Arrange
			transactionsDB.list.mockResolvedValue({ rows: [] });
			stocksDB.get.mockResolvedValue({ data: [] });
			historiesDB.list.mockResolvedValue({ rows: [] });

			// Act
			await arrangeHistorical();

			// Assert: The function should run without errors and attempt two empty bulk updates.
			expect(historiesDB.bulk).toHaveBeenCalledTimes(2);
			expect(historiesDB.bulk.mock.calls[0][0].docs).toEqual([]);
			expect(historiesDB.bulk.mock.calls[1][0].docs).toEqual([]);
		});
	});
});