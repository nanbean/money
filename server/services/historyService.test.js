const { arrangeKRHistorical, arrangeUSHistorical } = require('./historyService');
const { stocksDB, transactionsDB } = require('../db');
const historyDB = require('../db/historyDB');

// Mock the entire db module
jest.mock('../db', () => ({
	stocksDB: {
		get: jest.fn()
	},
	transactionsDB: {
		list: jest.fn()
	}
}));

jest.mock('../db/historyDB');

describe('historyService', () => {
	const MOCK_TODAY = '2023-10-27T10:00:00.000Z';
	const MOCK_YESTERDAY_ISO = '2023-10-26T18:00:00.000Z';

	// describe.each를 사용하여 중복 테스트를 통합합니다.
	// 각 배열은 [테스트 이름, 테스트할 함수, stocksDB.get에 전달될 인자 배열]을 나타냅니다.
	describe.each([
		['arrangeKRHistorical', arrangeKRHistorical, ['kospi', 'kosdaq']],
		['arrangeUSHistorical', arrangeUSHistorical, ['us']]
	])('%s', (name, arrangeHistorical, stockGetArgs) => { // name, 함수, 인자를 파라미터로 받음

		beforeEach(() => {
			jest.clearAllMocks();
			jest.useFakeTimers();
			jest.setSystemTime(new Date(MOCK_TODAY));
			jest.spyOn(console, 'log').mockImplementation(() => {});
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		test('should update existing histories and add new ones', async () => {
			// Arrange
			transactionsDB.list.mockResolvedValue({
				rows: [
					{ doc: { accountId: 'account:Invst:Broker', investment: 'AAPL' } }, // Existing
					{ doc: { accountId: 'account:Invst:Broker', investment: 'GOOG' } }  // New
				]
			});
			stocksDB.get.mockResolvedValue({
				data: [
					{ _id: 'investment:AAPL', name: 'AAPL', price: 170, yahooSymbol: 'AAPL' },
					{ _id: 'investment:GOOG', name: 'GOOG', price: 2800, yahooSymbol: 'GOOG' }
				]
			});
			historyDB.listHistories.mockResolvedValue([
				{ _id: 'history:AAPL', name: 'AAPL', data: [{ date: '2023-10-25T18:00:00.000Z', close: 165 }] }
			]);
			historyDB.bulkDocs.mockResolvedValue([{}]);

			// Act: 파라미터로 받은 함수를 실행합니다.
			await arrangeHistorical();

			// Assert
			expect(historyDB.bulkDocs).toHaveBeenCalledTimes(2);

			// 1. Assert the update call
			const firstBulkCallArgs = historyDB.bulkDocs.mock.calls[0][0];
			expect(firstBulkCallArgs).toHaveLength(1);
			expect(firstBulkCallArgs[0]).toMatchObject({ _id: 'history:AAPL', name: 'AAPL' });
			expect(firstBulkCallArgs[0].data).toHaveLength(2);
			expect(firstBulkCallArgs[0].data[0]).toEqual({
				date: MOCK_YESTERDAY_ISO,
				close: 170
			});

			// 2. Assert the insert call
			const secondBulkCallArgs = historyDB.bulkDocs.mock.calls[1][0];
			expect(secondBulkCallArgs).toHaveLength(1);
			expect(secondBulkCallArgs[0]).toMatchObject({ _id: 'history:GOOG', name: 'GOOG' });
			expect(secondBulkCallArgs[0].data).toHaveLength(1);
			expect(secondBulkCallArgs[0].data[0]).toEqual({
				date: MOCK_YESTERDAY_ISO,
				close: 2800
			});
            
			// 3. Assert stocksDB.get calls based on parameters
			// 파라미터로 받은 인자 배열을 기반으로 검증 로직을 동적으로 만듭니다.
			expect(stocksDB.get).toHaveBeenCalledTimes(stockGetArgs.length);
			stockGetArgs.forEach(arg => {
				expect(stocksDB.get).toHaveBeenCalledWith(arg);
			});
		});

		test('should only update history data for stocks present in the investements array', async () => {
			// Arrange
			transactionsDB.list.mockResolvedValue({
				rows: [
					{ doc: { accountId: 'account:Invst:Broker', investment: 'AAPL' } }, // Existing
					{ doc: { accountId: 'account:Invst:Broker', investment: 'GOOG' } }  // New
				]
			});
			stocksDB.get.mockResolvedValue({
				data: [
					{ _id: 'investment:AAPL', name: 'AAPL', price: 170, yahooSymbol: 'AAPL' }
				]
			});
			historyDB.listHistories.mockResolvedValue([
				{ _id: 'history:AAPL', name: 'AAPL', data: [{ date: '2023-10-25T18:00:00.000Z', close: 165 }] },
				{ _id: 'history:GOOG', name: 'GOOG', data: [{ date: '2023-10-25T18:00:00.000Z', close: 2900 }] }
			]);
			historyDB.bulkDocs.mockResolvedValue([{}]);

			// Act: 파라미터로 받은 함수를 실행합니다.
			await arrangeHistorical();

			// Assert the update call
			const firstBulkCallArgs = historyDB.bulkDocs.mock.calls[0][0];
			expect(firstBulkCallArgs).toHaveLength(2);
			expect(firstBulkCallArgs[0]).toMatchObject({ _id: 'history:AAPL', name: 'AAPL' });
			expect(firstBulkCallArgs[0].data).toHaveLength(2);
			expect(firstBulkCallArgs[0].data[0]).toEqual({
				date: MOCK_YESTERDAY_ISO,
				close: 170
			});
			expect(firstBulkCallArgs[1]).toMatchObject({ _id: 'history:GOOG', name: 'GOOG' });
			expect(firstBulkCallArgs[1].data).toHaveLength(1);
		});

		test('should not add a duplicate date entry to an existing history', async () => {
			// Arrange
			transactionsDB.list.mockResolvedValue({
				rows: [{ doc: { accountId: 'account:Invst:Broker', investment: 'AAPL' } }]
			});
			stocksDB.get.mockResolvedValue({
				data: [{ _id: 'investment:AAPL', name: 'AAPL', price: 170, yahooSymbol: 'AAPL' }]
			});
			historyDB.listHistories.mockResolvedValue([
				{ _id: 'history:AAPL', name: 'AAPL', data: [{ date: MOCK_YESTERDAY_ISO, close: 170 }] }
			]);
			historyDB.bulkDocs.mockResolvedValue([{}]);

			// Act
			await arrangeHistorical();

			// Assert
			expect(historyDB.bulkDocs).toHaveBeenCalledTimes(1);
			const firstBulkCallArgs = historyDB.bulkDocs.mock.calls[0][0];
			expect(firstBulkCallArgs).toHaveLength(1);
			expect(firstBulkCallArgs[0].data).toHaveLength(1); // De-duplication check
		});

		test('should handle case with no existing histories in the database', async () => {
			// Arrange
			transactionsDB.list.mockResolvedValue({ rows: [] });
			stocksDB.get.mockResolvedValue({ data: [] });
			historyDB.listHistories.mockResolvedValue([]);

			// Act
			await arrangeHistorical();

			// Assert
			expect(historyDB.bulkDocs).toHaveBeenCalledTimes(1);
			expect(historyDB.bulkDocs.mock.calls[0][0]).toEqual([]);
		});
	});
});