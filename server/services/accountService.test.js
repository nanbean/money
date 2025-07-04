const { getAllAccounts, updateAccountList } = require('./accountService');
const { accountsDB, stocksDB } = require('../db');
const pouchdb = require('../db/pouchdb');

// Mocks the PouchDB `list` method.
jest.mock('../db', () => ({
	accountsDB: {
		list: jest.fn(),
		bulk: jest.fn()
	},
	stocksDB: {
		get: jest.fn()
	}
}));

// Mocks the pouchdb module to prevent CronJob from running during tests.
jest.mock('../db/pouchdb', () => ({
	getAllTransactions: jest.fn()
}));

describe('accountService', () => {
	// Before each test, clear all mock call history to ensure tests are independent.
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getAllAccounts', () => {
		test('should return all account documents when the database has data', async () => {
			// Arrange: Sets up mock data that the database will return.
			const mockDbResponse = {
				rows: [
					{ doc: { _id: 'account:Cash:Wallet', name: 'Wallet', type: 'Cash', balance: 100 } },
					{ doc: { _id: 'account:Invst:Broker', name: 'Broker', type: 'Invst', balance: 5000 } }
				]
			};
			accountsDB.list.mockResolvedValue(mockDbResponse);
			
			// Act: Calls the function to be tested.
			const accounts = await getAllAccounts();

			// Assert: Checks if the result matches the expectation.
			expect(accountsDB.list).toHaveBeenCalledWith({ include_docs: true });
			expect(accounts).toHaveLength(2);
			expect(accounts).toEqual(mockDbResponse.rows.map(row => row.doc));
		});

		test('should return an empty array when the database has no accounts', async () => {
			// Arrange: Simulates a case where there is no data.
			accountsDB.list.mockResolvedValue({ rows: [] });

			const accounts = await getAllAccounts();

			expect(accounts).toEqual([]);
		});

		test('should throw an error if the database call fails', async () => {
			// Arrange: Simulates a database call failure.
			const dbError = new Error('Database connection failed');
			accountsDB.list.mockRejectedValue(dbError);

			// Act & Assert: Checks if the function properly propagates the error.
			await expect(getAllAccounts()).rejects.toThrow('Database connection failed');
		});
	});

	describe('updateAccountList', () => {
		test('should correctly update balances and investments for all account types', async () => {
			// Arrange: Sets up mock data for all dependencies.
			const mockAccounts = [
				{ _id: 'account:Cash:Wallet', type: 'Cash', name: 'Wallet' },
				{ _id: 'account:Invst:Broker', type: 'Invst', name: 'Broker', cashAccountId: 'account:Cash:Broker_Cash' },
				{ _id: 'account:Cash:Broker_Cash', type: 'Cash', name: 'Broker_Cash' }
			];

			const mockTransactions = [
				// Transactions for Wallet account
				{ accountId: 'account:Cash:Wallet', amount: 100 },
				{ accountId: 'account:Cash:Wallet', amount: -20 },
				// Transactions for Broker (investment) account
				{ accountId: 'account:Invst:Broker', activity: 'Buy', investment: 'AAPL', quantity: 10, price: 150, amount: 1500 },
				{ accountId: 'account:Invst:Broker', activity: 'Buy', investment: 'AAPL', quantity: 10, price: 150, amount: 1500 },
				{ accountId: 'account:Invst:Broker', activity: 'Sell', investment: 'AAPL', quantity: 10, price: 200, amount: 2000 },
				// Transactions for Broker_Cash (investment cash) account
				{ accountId: 'account:Cash:Broker_Cash', amount: 5000 } // Initial deposit
			];

			const mockStocks = {
				kospi: { data: [] },
				kosdaq: { data: [] },
				us: { data: [{ name: 'AAPL', price: 170 }] } // Current price
			};

			accountsDB.list.mockResolvedValue({ rows: mockAccounts.map(doc => ({ doc })) });
			pouchdb.getAllTransactions.mockResolvedValue(mockTransactions);
			stocksDB.get.mockImplementation(id => Promise.resolve(mockStocks[id]));

			// Act: Calls the function to be tested.
			await updateAccountList();

			// Assert: Checks if accountsDB.bulk was called with the correct data.
			expect(accountsDB.bulk).toHaveBeenCalledTimes(1);
			const updatedDocs = accountsDB.bulk.mock.calls[0][0].docs;

			// 1. Validate Wallet account
			const walletAccount = updatedDocs.find(a => a.name === 'Wallet');
			expect(walletAccount.balance).toBe(80); // 100 - 20
			expect(walletAccount.investments).toEqual([]);

			// 2. Validate Broker (investment) account
			const brokerAccount = updatedDocs.find(a => a.name === 'Broker');
			// Appraised value of investment assets: 10 shares * current price 170 = 1700
			const investmentValue = 1700;
			// Balance of linked cash account: Initial deposit 5000 - stock purchase 1500 - stock purchase 1500 + - stock sell 2000 = 4000
			const cashBalance = 4000;
			expect(brokerAccount.balance).toBe(investmentValue + cashBalance); // 1700 + 4000 = 5700
			expect(brokerAccount.cashBalance).toBe(cashBalance);
			expect(brokerAccount.investments).toHaveLength(1);
			expect(brokerAccount.investments[0]).toMatchObject({
				name: 'AAPL',
				quantity: 10,
				purchasedPrice: 150,
				price: 170 // Updated to current price
			});

			// 3. Validate Broker_Cash account (this account itself is not updated directly)
			const brokerCashAccount = updatedDocs.find(a => a.name === 'Broker_Cash');
			// Balance is calculated according to the getBalance logic: 5000
			expect(brokerCashAccount.balance).toBe(5000); 
		});

		test('should log an error and not update accounts if a database read fails', async () => {
			// Arrange: Simulates a DB call failure.
			const dbError = new Error('DB read failed');
			accountsDB.list.mockRejectedValue(dbError);

			// Mocks console.log to check for error messages and keep the test output clean.
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

			// Act: Calls the function to be tested.
			await updateAccountList();

			// Assert: Checks that the DB update was not attempted.
			expect(accountsDB.bulk).not.toHaveBeenCalled();
			// Checks if the error was logged.
			expect(consoleSpy).toHaveBeenCalledWith(dbError);

			// Restores the spy.
			consoleSpy.mockRestore();
		});
	});
});