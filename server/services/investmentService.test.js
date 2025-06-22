const { arrangeKRInvestmemt, arrangeUSInvestmemt } = require('./investmentService');
const { accountsDB, stocksDB } = require('../db');
const kisConnector = require('../kisConnector');
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

jest.mock('../kisConnector', () => ({
	getKisToken: jest.fn(),
	getKisQuoteKorea: jest.fn(),
	getKisQuoteUS: jest.fn()
}));

describe('investmentService', () => {
	// Before each test, clear all mock call history to ensure tests are independent.
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('arrangeKRInvestmemt', () => {
		test('should fetch prices and update the stocks database correctly', async () => {
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
			kisConnector.getKisToken.mockResolvedValue('fake-token');
			kisConnector.getKisQuoteKorea.mockImplementation(async (token, symbol) => {
				if (symbol === 'KRX:005930') {
					return { googleSymbol: 'KRX:005930', output: { stck_prpr: '75000' } }; // New price
				}
				if (symbol === 'KRX:000660') {
					return { googleSymbol: 'KRX:000660', output: { stck_prpr: '135000' } }; // New price
				}
				return { googleSymbol: symbol, output: null };
			});

			// Act
			await arrangeKRInvestmemt();

			// Assert
			// 1. Check if KIS API was called only for stocks present in accounts
			expect(kisConnector.getKisToken).toHaveBeenCalledTimes(1);
			expect(kisConnector.getKisQuoteKorea).toHaveBeenCalledTimes(2);
			expect(kisConnector.getKisQuoteKorea).toHaveBeenCalledWith('fake-token', 'KRX:005930');
			expect(kisConnector.getKisQuoteKorea).toHaveBeenCalledWith('fake-token', 'KRX:000660');

			// 2. Check if stocksDB.insert was called with the updated data
			expect(stocksDB.insert).toHaveBeenCalledTimes(1);
			const insertedData = stocksDB.insert.mock.calls[0][0];

			expect(insertedData.date).toBe(moment().tz('Asia/Seoul').format('YYYY-MM-DD'));
			expect(insertedData.data).toHaveLength(3);

			// 3. Verify the prices were updated correctly
			const samsung = insertedData.data.find(s => s.name === 'Samsung Electronics');
			const skHynix = insertedData.data.find(s => s.name === 'SK Hynix');
			const lgChem = insertedData.data.find(s => s.name === 'LG Chem');

			expect(samsung.price).toBe(75000); // Updated
			expect(skHynix.price).toBe(135000); // Updated
			expect(lgChem.price).toBe(400000); // Unchanged
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
			kisConnector.getKisToken.mockResolvedValue('fake-us-token');
			kisConnector.getKisQuoteUS.mockImplementation(async (token, symbol) => {
				if (symbol === 'NASDAQ:AAPL') {
					return { googleSymbol: 'NASDAQ:AAPL', output: { last: '175.50' } }; // New price
				}
				if (symbol === 'NASDAQ:TSLA') {
					return { googleSymbol: 'NASDAQ:TSLA', output: { last: '245.25' } }; // New price
				}
				return { googleSymbol: symbol, output: null };
			});

			// Act
			await arrangeUSInvestmemt();

			// Assert
			// 1. Check if KIS API was called only for stocks present in accounts
			expect(kisConnector.getKisToken).toHaveBeenCalledTimes(1);
			expect(kisConnector.getKisQuoteUS).toHaveBeenCalledTimes(2);
			expect(kisConnector.getKisQuoteUS).toHaveBeenCalledWith('fake-us-token', 'NASDAQ:AAPL');
			expect(kisConnector.getKisQuoteUS).toHaveBeenCalledWith('fake-us-token', 'NASDAQ:TSLA');

			// 2. Check if stocksDB.insert was called with the updated data
			expect(stocksDB.insert).toHaveBeenCalledTimes(1);
			const insertedData = stocksDB.insert.mock.calls[0][0];

			expect(insertedData.date).toBe(moment().tz('America/Los_Angeles').format('YYYY-MM-DD'));
			expect(insertedData.data).toHaveLength(3);

			// 3. Verify the prices were updated correctly
			expect(insertedData.data.find(s => s.name === 'Apple').price).toBe(175.50); // Updated
			expect(insertedData.data.find(s => s.name === 'Tesla').price).toBe(245.25); // Updated
			expect(insertedData.data.find(s => s.name === 'Microsoft').price).toBe(300.00); // Unchanged
		});
	});
});