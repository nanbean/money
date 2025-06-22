const reportService = require('./reportService');
const { reportsDB, accountsDB, transactionsDB, stocksDB, historiesDB } = require('../db');
const spreadSheet = require('../spreadSheet');
const { getInvestmentList, getInvestmentBalance } = require('../utils/investment');
const { getBalance } = require('../utils/account');
const settingService = require('./settingService');
const accountService = require('./accountService');

// Mock all external dependencies
jest.mock('../db', () => ({
	reportsDB: {
		get: jest.fn(),
		insert: jest.fn()
	},
	accountsDB: {
		list: jest.fn()
	},
	transactionsDB: {
		list: jest.fn()
	},
	stocksDB: {
		get: jest.fn()
	},
	historiesDB: {
		list: jest.fn()
	}
}));

jest.mock('../spreadSheet', () => ({
	getLifetimeFlowList: jest.fn()
}));

jest.mock('../utils/investment', () => ({
	getInvestmentList: jest.fn(),
	getInvestmentBalance: jest.fn()
}));

jest.mock('../utils/account', () => ({
	getBalance: jest.fn()
}));

jest.mock('./settingService', () => ({
	getExchangeRate: jest.fn()
}));

jest.mock('./accountService', () => ({
	getAllAccounts: jest.fn()
}));

describe('reportService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Mock console functions to keep test output clean
		jest.spyOn(console, 'log').mockImplementation(() => {});
		jest.spyOn(console, 'time').mockImplementation(() => {});
		jest.spyOn(console, 'timeEnd').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('updateLifeTimePlanner', () => {
		test('should fetch data from spreadsheet and update an existing report', async () => {
			// Arrange
			const mockLifetimeData = [{ event: 'Retirement', age: 65 }];
			const mockAccounts = [{ name: 'My Account' }];
			const mockOldReport = { _id: 'lifetimeplanner', _rev: '1-abc' };

			accountService.getAllAccounts.mockResolvedValue(mockAccounts);
			spreadSheet.getLifetimeFlowList.mockResolvedValue(mockLifetimeData);
			reportsDB.get.mockResolvedValue(mockOldReport);

			// Act
			await reportService.updateLifeTimePlanner();

			// Assert
			expect(accountService.getAllAccounts).toHaveBeenCalledTimes(1);
			expect(spreadSheet.getLifetimeFlowList).toHaveBeenCalledWith(mockAccounts);
			expect(reportsDB.get).toHaveBeenCalledWith('lifetimeplanner', { revs_info: true });
			expect(reportsDB.insert).toHaveBeenCalledTimes(1);
			
			const insertedDoc = reportsDB.insert.mock.calls[0][0];
			expect(insertedDoc._id).toBe('lifetimeplanner');
			expect(insertedDoc._rev).toBe('1-abc'); // Should have the _rev from the old report
			expect(insertedDoc.data).toEqual(mockLifetimeData);
			expect(insertedDoc.date).toBeInstanceOf(Date);
		});

		test('should create a new report if one does not exist', async () => {
			// Arrange
			const mockLifetimeData = [{ event: 'New Goal', age: 40 }];
			accountService.getAllAccounts.mockResolvedValue([]);
			spreadSheet.getLifetimeFlowList.mockResolvedValue(mockLifetimeData);
			reportsDB.get.mockRejectedValue({ status: 404 }); // Simulate "not found"

			// Act
			await reportService.updateLifeTimePlanner();

			// Assert
			expect(reportsDB.insert).toHaveBeenCalledTimes(1);
			const insertedDoc = reportsDB.insert.mock.calls[0][0];
			expect(insertedDoc._id).toBe('lifetimeplanner');
			expect(insertedDoc._rev).toBeUndefined(); // Should be a new doc
			expect(insertedDoc.data).toEqual(mockLifetimeData);
		});

		test('should log an error if fetching the old report fails with a non-404 error', async () => {
			// Arrange
			const dbError = new Error('DB connection failed');
			reportsDB.get.mockRejectedValue(dbError);
			accountService.getAllAccounts.mockResolvedValue([]);
			spreadSheet.getLifetimeFlowList.mockResolvedValue([]);

			// Act
			await reportService.updateLifeTimePlanner();

			// Assert
			// The function should still proceed and try to insert a new document
			expect(reportsDB.insert).toHaveBeenCalledTimes(1);
			const insertedDoc = reportsDB.insert.mock.calls[0][0];
			expect(insertedDoc._rev).toBeUndefined();
			// And it should log the error
			expect(console.log).toHaveBeenCalledWith(dbError);
		});
	});

	describe('getLifetimeFlowList', () => {
		test('should retrieve and return the data from the lifetimeplanner report', async () => {
			// Arrange
			const mockReport = {
				_id: 'lifetimeplanner',
				data: [{ event: 'Buy House', age: 35 }]
			};
			reportsDB.get.mockResolvedValue(mockReport);

			// Act
			const result = await reportService.getLifetimeFlowList();

			// Assert
			expect(reportsDB.get).toHaveBeenCalledWith('lifetimeplanner', { revs_info: true });
			expect(result).toEqual(mockReport.data);
		});
	});

	describe('getNetWorth', () => {
		// This test is complex because it validates the core calculation logic.
		test('should calculate net worth correctly for various account types and currencies', async () => {
			// Arrange
			const mockAccounts = [
				{ type: 'Cash', name: 'Wallet', currency: 'KRW' },
				{ type: 'Invst', name: 'Broker', currency: 'USD' },
				{ type: 'Oth L', name: 'Loan', currency: 'KRW' },
				{ type: 'Oth A', name: 'RealEstate', currency: 'KRW' },
				{ type: 'Cash', name: 'Broker_Cash', currency: 'USD' }
			];
			const date = '2023-10-31';
			const mockTransactionsByAccount = {
				'account:Cash:Wallet': [
					{ date: '2023-09-15', amount: 50000 }, // Previous month data
					{ date: '2023-10-01', amount: 100000 }
				],
				'account:Invst:Broker': [{ date: '2023-10-02', activity: 'Buy', investment: 'AAPL', quantity: 10, price: 150, amount: 1500 }],
				'account:Oth L:Loan': [
					{ date: '2023-09-20', amount: -100000 }, // Previous month data
					{ date: '2023-10-03', amount: -500000 }
				],
				'account:Oth A:RealEstate': [{ date: '2023-10-04', amount: 2000000 }],
				'account:Cash:Broker_Cash': [{ date: '2023-10-05', amount: 2000 }]
			};
			const mockAllTransactions = Object.values(mockTransactionsByAccount).flat();
			const mockAllInvestments = [{ name: 'AAPL', price: 170 }]; // Current price

			// Mock dependencies
			settingService.getExchangeRate.mockResolvedValue(1300);
			getInvestmentList.mockReturnValue([{ name: 'AAPL', quantity: 10, price: 170 }]);
			getInvestmentBalance.mockReturnValue(1700); // 10 shares * $170/share
			getBalance.mockImplementation((name, transactions, invTransactions) => {
				if (name === 'Wallet') return 150000; // 50000 + 100000
				if (name === 'Loan') return -600000; // -100000 + -500000
				if (name === 'RealEstate') return 2000000;
				if (name === 'Broker_Cash') return 500; // 2000 (deposit) - 1500 (buy)
				return 0;
			});

			// Act
			const result = await reportService.getNetWorth(mockAccounts, mockAllTransactions, mockTransactionsByAccount, mockAllInvestments, [], date);

			// Assert
			// 1. Cash (Wallet): 50,000 + 100,000 = 150,000 KRW
			expect(result.cashNetWorth).toBe(150000);
			// 2. Investments (Broker + Broker_Cash in USD, converted to KRW)
			//    - Stock value: $1700 * 1300 = 2,210,000 KRW
			//    - Cash value: $500 * 1300 = 650,000 KRW
			//    - Total: 2,210,000 + 650,000 = 2,860,000 KRW
			expect(result.investmentsNetWorth).toBe(2860000);
			// 3. Other Assets (RealEstate): 2,000,000 KRW
			expect(result.assetNetWorth).toBe(2000000);
			// 4. Liabilities (Loan): -100,000 + -500,000 = -600,000 KRW
			expect(result.loanNetWorth).toBe(-600000);
			// 5. Total Net Worth: 150,000 + 2,860,000 + 2,000,000 - 600,000 = 4,410,000 KRW
			expect(result.netWorth).toBe(4410000);
			// 6. Movable Asset: 150,000 + 2,860,000 - 600,000 = 2,410,000 KRW
			expect(result.movableAsset).toBe(2410000);
			expect(result.netInvestments).toHaveLength(1);
			expect(result.netInvestments[0].name).toBe('AAPL');
		});

		test('should correctly filter transactions by date', async () => {
			// Arrange
			const mockAccounts = [{ type: 'Cash', name: 'Wallet', currency: 'KRW' }];
			const date = '2023-01-31';
			const mockTransactionsByAccount = {
				'account:Cash:Wallet': [
					{ date: '2023-01-15', amount: 1000 }, // Should be included
					{ date: '2023-02-15', amount: 5000 }  // Should be excluded
				]
			};
			settingService.getExchangeRate.mockResolvedValue(1300);
			// Mock getBalance to be called with only the filtered transaction
			getBalance.mockImplementation((name, transactions) => {
				expect(transactions).toHaveLength(1);
				expect(transactions[0].amount).toBe(1000);
				return 1000;
			});

			// Act
			await reportService.getNetWorth(mockAccounts, [], mockTransactionsByAccount, [], [], date);

			// Assert
			expect(getBalance).toHaveBeenCalledWith('Wallet', [{ date: '2023-01-15', amount: 1000 }]);
		});
	});

	describe('updateNetWorth', () => {
		const MOCK_CURRENT_DATE = '2023-03-15T12:00:00Z';

		beforeEach(() => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date(MOCK_CURRENT_DATE));
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		test('should fetch all data, calculate net worth for each month, and create a new report', async () => {
			// Arrange: Mock all DB and service calls
			reportsDB.get.mockRejectedValue({ status: 404 }); // No existing report
			accountsDB.list.mockResolvedValue({ rows: [{ doc: { type: 'Cash', name: 'Wallet', currency: 'KRW' } }] });
			transactionsDB.list.mockResolvedValue({ rows: [{ doc: { accountId: 'account:Cash:Wallet', date: '2022-01-01', amount: 1000 } }] });
			stocksDB.get.mockResolvedValue({ data: [] });
			historiesDB.list.mockResolvedValue({ rows: [] });
			settingService.getExchangeRate.mockResolvedValue(1300);
			
			// Mock the result of getBalance for simplicity.
			// getNetWorth will call this for each date.
			getBalance.mockReturnValue(1000);
			getInvestmentList.mockReturnValue([]);
			getInvestmentBalance.mockReturnValue(0);

			// Act
			await reportService.updateNetWorth();

			// Assert
			// 1. Verify all data was fetched
			expect(accountsDB.list).toHaveBeenCalledTimes(1);
			expect(transactionsDB.list).toHaveBeenCalledTimes(1);
			expect(stocksDB.get).toHaveBeenCalledWith('kospi');
			expect(stocksDB.get).toHaveBeenCalledWith('kosdaq');
			expect(stocksDB.get).toHaveBeenCalledWith('us');
			expect(historiesDB.list).toHaveBeenCalledTimes(1);
			expect(reportsDB.get).toHaveBeenCalledWith('netWorth', { revs_info: true });

			// 2. Verify the report was inserted
			expect(reportsDB.insert).toHaveBeenCalledTimes(1);
			const insertedDoc = reportsDB.insert.mock.calls[0][0];
			expect(insertedDoc._id).toBe('netWorth');
			expect(insertedDoc._rev).toBeUndefined(); // New document

			// 3. Verify the data array was generated correctly
			// (2023-2005)*12 + 3 = 18*12 + 3 = 216 + 3 = 219 dates
			const expectedDateCount = (2023 - 2005) * 12 + 3;
			expect(insertedDoc.data).toHaveLength(expectedDateCount);

			// 4. Verify the content of a data point
			// The last data point should be for March 2023
			const lastDataPoint = insertedDoc.data[insertedDoc.data.length - 1];
			expect(lastDataPoint.date).toBe('2023-03-31');
			// Since getBalance is mocked to return 1000 for the wallet, net worth should be 1000
			expect(lastDataPoint.netWorth).toBe(1000);
			expect(lastDataPoint.cashNetWorth).toBe(1000);
			expect(lastDataPoint.investmentsNetWorth).toBe(0);
		});

		test('should update an existing report', async () => {
			// Arrange
			reportsDB.get.mockResolvedValue({ _id: 'netWorth', _rev: '2-xyz' });
			// Mock other dependencies to return empty data to speed up the test
			accountsDB.list.mockResolvedValue({ rows: [] });
			transactionsDB.list.mockResolvedValue({ rows: [] });
			stocksDB.get.mockResolvedValue({ data: [] });
			historiesDB.list.mockResolvedValue({ rows: [] });
			settingService.getExchangeRate.mockResolvedValue(1300);
			getBalance.mockReturnValue(0);
			getInvestmentList.mockReturnValue([]);
			getInvestmentBalance.mockReturnValue(0);

			// Act
			await reportService.updateNetWorth();

			// Assert
			expect(reportsDB.insert).toHaveBeenCalledTimes(1);
			const insertedDoc = reportsDB.insert.mock.calls[0][0];
			expect(insertedDoc._id).toBe('netWorth');
			expect(insertedDoc._rev).toBe('2-xyz'); // Should use the existing _rev
			const expectedDateCount = (2023 - 2005) * 12 + 3;
			expect(insertedDoc.data).toHaveLength(expectedDateCount);
			expect(insertedDoc.data[0].netWorth).toBe(0);
		});
	});
});