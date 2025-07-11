
const { getSettings, getExchangeRate, getCategoryList, arrangeExchangeRate } = require('./settingService');
const settingDB = require('../db/settingDB');
const kisConnector = require('./kisConnector');

// Mock dependencies
jest.mock('../db/settingDB', () => ({
	getSettings: jest.fn(),
	insertSetting: jest.fn()
}));

jest.mock('./kisConnector', () => ({
	getKisToken: jest.fn(),
	getKisExchangeRate: jest.fn()
}));

describe('settingService', () => {
	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();
	});

	describe('getSettings', () => {
		test('should return all setting documents', async () => {
			// Arrange
			const mockSettings = [
				{ _id: 'exchangeRate', value: 1300 },
				{ _id: 'categoryList', value: ['Food', 'Transport'] }
			];
			settingDB.getSettings.mockResolvedValue(mockSettings);

			// Act
			const settings = await getSettings();

			// Assert
			expect(settingDB.getSettings).toHaveBeenCalled();
			expect(settings).toHaveLength(2);
			expect(settings).toEqual(mockSettings);
		});

		test('should return an empty array if no settings exist', async () => {
			// Arrange
			settingDB.getSettings.mockResolvedValue([]);

			// Act
			const settings = await getSettings();

			// Assert
			expect(settings).toEqual([]);
		});
	});

	describe('getExchangeRate', () => {
		test('should return the exchange rate from the settings', async () => {
			// Arrange
			const mockSettings = [{ _id: 'exchangeRate', value: 1350.5 }];
			settingDB.getSettings.mockResolvedValue(mockSettings);

			// Act
			const rate = await getExchangeRate();

			// Assert
			expect(rate).toBe(1350.5);
		});

		test('should return the default exchange rate (1000) if exchangeRate setting is missing', async () => {
			// Arrange
			const mockSettings = [{ _id: 'other', value: 'something' }];
			settingDB.getSettings.mockResolvedValue(mockSettings);

			// Act
			const rate = await getExchangeRate();

			// Assert
			expect(rate).toBe(1000);
		});
	});

	describe('getCategoryList', () => {
		test('should return the category list data from the settings', async () => {
			// Arrange
			const mockCategories = ['Groceries', 'Utilities', 'Entertainment'];
			const mockSettings = [{ _id: 'categoryList', value: mockCategories }];
			settingDB.getSettings.mockResolvedValue(mockSettings);

			// Act
			const categories = await getCategoryList();

			// Assert
			expect(categories).toEqual(mockCategories);
		});

		test('should return an empty array if categoryList setting is missing', async () => {
			// Arrange
			const mockSettings = [{ _id: 'exchangeRate', value: 1300 }];
			settingDB.getSettings.mockResolvedValue(mockSettings);

			// Act
			const categories = await getCategoryList();

			// Assert
			expect(categories).toEqual([]);
		});
	});

	describe('arrangeExchangeRate', () => {
		test('should fetch and update the exchange rate when enabled', async () => {
			// Arrange
			const mockSettings = [
				{ _id: 'enableExchangeRateUpdate', value: true },
				{ _id: 'exchangeRate', _rev: '1-abc', value: 1300 }
			];
			settingDB.getSettings.mockResolvedValue(mockSettings);
			kisConnector.getKisToken.mockResolvedValue('fake-token');
			kisConnector.getKisExchangeRate.mockResolvedValue(1355.7);

			// Act
			await arrangeExchangeRate();

			// Assert
			expect(kisConnector.getKisToken).toHaveBeenCalledTimes(1);
			expect(kisConnector.getKisExchangeRate).toHaveBeenCalledWith('fake-token');
			expect(settingDB.insertSetting).toHaveBeenCalledTimes(1);
			expect(settingDB.insertSetting).toHaveBeenCalledWith({
				_id: 'exchangeRate',
				_rev: '1-abc',
				value: 1355.7
			});
		});

		test('should not update the exchange rate when disabled', async () => {
			// Arrange
			const mockSettings = [
				{ _id: 'enableExchangeRateUpdate', value: false },
				{ _id: 'exchangeRate', value: 1300 }
			];
			settingDB.getSettings.mockResolvedValue(mockSettings);

			// Act
			await arrangeExchangeRate();

			// Assert
			expect(kisConnector.getKisToken).not.toHaveBeenCalled();
			expect(kisConnector.getKisExchangeRate).not.toHaveBeenCalled();
			expect(settingDB.insertSetting).not.toHaveBeenCalled();
		});

		test('should not update if fetching the new exchange rate fails (returns null)', async () => {
			// Arrange
			const mockSettings = [
				{ _id: 'enableExchangeRateUpdate', value: true },
				{ _id: 'exchangeRate', value: 1300 }
			];
			settingDB.getSettings.mockResolvedValue(mockSettings);
			kisConnector.getKisToken.mockResolvedValue('fake-token');
			kisConnector.getKisExchangeRate.mockResolvedValue(null); // KIS call failed

			// Act
			await arrangeExchangeRate();

			// Assert
			expect(kisConnector.getKisToken).toHaveBeenCalledTimes(1);
			expect(kisConnector.getKisExchangeRate).toHaveBeenCalledWith('fake-token');
			expect(settingDB.insertSetting).not.toHaveBeenCalled();
		});

		test('should handle missing enableExchangeRateUpdate setting gracefully', async () => {
			// Arrange
			const mockSettings = [{ _id: 'exchangeRate', value: 1300 }];
			settingDB.getSettings.mockResolvedValue(mockSettings);

			// Act & Assert
			await expect(arrangeExchangeRate()).resolves.not.toThrow();
			expect(kisConnector.getKisToken).not.toHaveBeenCalled();
			expect(settingDB.insertSetting).not.toHaveBeenCalled();
		});
	});
});
