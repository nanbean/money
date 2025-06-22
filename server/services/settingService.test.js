const { getSettings, getExchangeRate, getCategoryList, arrangeExchangeRate } = require('./settingService');
const { settingsDB } = require('../db');
const kisConnector = require('../kisConnector');

// Mock dependencies
jest.mock('../db', () => ({
	settingsDB: {
		list: jest.fn(),
		insert: jest.fn()
	}
}));

jest.mock('../kisConnector', () => ({
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
			const mockSettings = {
				rows: [
					{ doc: { _id: 'general', exchangeRate: 1300 } },
					{ doc: { _id: 'categoryList', data: ['Food', 'Transport'] } }
				]
			};
			settingsDB.list.mockResolvedValue(mockSettings);

			// Act
			const settings = await getSettings();

			// Assert
			expect(settingsDB.list).toHaveBeenCalledWith({ include_docs: true });
			expect(settings).toHaveLength(2);
			expect(settings).toEqual(mockSettings.rows.map(row => row.doc));
		});

		test('should return an empty array if no settings exist', async () => {
			// Arrange
			settingsDB.list.mockResolvedValue({ rows: [] });

			// Act
			const settings = await getSettings();

			// Assert
			expect(settings).toEqual([]);
		});
	});

	describe('getExchangeRate', () => {
		test('should return the exchange rate from the general settings document', async () => {
			// Arrange
			const mockSettings = {
				rows: [{ doc: { _id: 'general', exchangeRate: 1350.5 } }]
			};
			settingsDB.list.mockResolvedValue(mockSettings);

			// Act
			const rate = await getExchangeRate();

			// Assert
			expect(rate).toBe(1350.5);
		});

		test('should return the default exchange rate (1000) if general settings document is missing', async () => {
			// Arrange
			const mockSettings = {
				rows: [{ doc: { _id: 'other', value: 'something' } }]
			};
			settingsDB.list.mockResolvedValue(mockSettings);

			// Act
			const rate = await getExchangeRate();

			// Assert
			expect(rate).toBe(1000);
		});

		test('should return the default exchange rate (1000) if exchangeRate property is missing', async () => {
			// Arrange
			const mockSettings = {
				rows: [{ doc: { _id: 'general', someOtherProp: true } }]
			};
			settingsDB.list.mockResolvedValue(mockSettings);

			// Act
			const rate = await getExchangeRate();

			// Assert
			expect(rate).toBe(1000);
		});
	});

	describe('getCategoryList', () => {
		test('should return the category list data from the settings document', async () => {
			// Arrange
			const mockCategories = ['Groceries', 'Utilities', 'Entertainment'];
			const mockSettings = {
				rows: [{ doc: { _id: 'categoryList', data: mockCategories } }]
			};
			settingsDB.list.mockResolvedValue(mockSettings);

			// Act
			const categories = await getCategoryList();

			// Assert
			expect(categories).toEqual(mockCategories);
		});

		test('should return an empty array if categoryList document is missing', async () => {
			// Arrange
			const mockSettings = {
				rows: [{ doc: { _id: 'general', exchangeRate: 1300 } }]
			};
			settingsDB.list.mockResolvedValue(mockSettings);

			// Act
			const categories = await getCategoryList();

			// Assert
			expect(categories).toEqual([]);
		});

		test('should return an empty array if data property is missing in categoryList document', async () => {
			// Arrange
			const mockSettings = {
				rows: [{ doc: { _id: 'categoryList', name: 'Categories' } }] // No 'data' property
			};
			settingsDB.list.mockResolvedValue(mockSettings);

			// Act
			const categories = await getCategoryList();

			// Assert
			expect(categories).toEqual([]);
		});
	});

	describe('arrangeExchangeRate', () => {
		test('should fetch and update the exchange rate when enabled', async () => {
			// Arrange
			const mockGeneralSetting = { _id: 'general', _rev: '1-abc', enableExchangeRateUpdate: true, exchangeRate: 1300 };
			settingsDB.list.mockResolvedValue({ rows: [{ doc: mockGeneralSetting }] });
			kisConnector.getKisToken.mockResolvedValue('fake-token');
			kisConnector.getKisExchangeRate.mockResolvedValue(1355.7);

			// Act
			await arrangeExchangeRate();

			// Assert
			expect(kisConnector.getKisToken).toHaveBeenCalledTimes(1);
			expect(kisConnector.getKisExchangeRate).toHaveBeenCalledWith('fake-token');
			expect(settingsDB.insert).toHaveBeenCalledTimes(1);
			expect(settingsDB.insert).toHaveBeenCalledWith({
				...mockGeneralSetting,
				exchangeRate: 1355.7 // The new rate
			});
		});

		test('should not update the exchange rate when disabled', async () => {
			// Arrange
			const mockGeneralSetting = { _id: 'general', enableExchangeRateUpdate: false, exchangeRate: 1300 };
			settingsDB.list.mockResolvedValue({ rows: [{ doc: mockGeneralSetting }] });

			// Act
			await arrangeExchangeRate();

			// Assert
			expect(kisConnector.getKisToken).not.toHaveBeenCalled();
			expect(kisConnector.getKisExchangeRate).not.toHaveBeenCalled();
			expect(settingsDB.insert).not.toHaveBeenCalled();
		});

		test('should not update if fetching the new exchange rate fails (returns null)', async () => {
			// Arrange
			const mockGeneralSetting = { _id: 'general', enableExchangeRateUpdate: true, exchangeRate: 1300 };
			settingsDB.list.mockResolvedValue({ rows: [{ doc: mockGeneralSetting }] });
			kisConnector.getKisToken.mockResolvedValue('fake-token');
			kisConnector.getKisExchangeRate.mockResolvedValue(null); // KIS call failed

			// Act
			await arrangeExchangeRate();

			// Assert
			expect(kisConnector.getKisToken).toHaveBeenCalledTimes(1);
			expect(kisConnector.getKisExchangeRate).toHaveBeenCalledWith('fake-token');
			expect(settingsDB.insert).not.toHaveBeenCalled();
		});

		test('should handle missing general settings gracefully without crashing', async () => {
			// Arrange
			settingsDB.list.mockResolvedValue({ rows: [] }); // No 'general' setting

			// Act & Assert
			// With the bug fix, this should complete without throwing an error.
			await expect(arrangeExchangeRate()).resolves.not.toThrow();
			expect(kisConnector.getKisToken).not.toHaveBeenCalled();
			expect(settingsDB.insert).not.toHaveBeenCalled();
		});
	});
});