const checkAndSendNotification = require('./paymentService');
const { getSettings } = require('../db/settingDB');
const { getAllTransactions } = require('./transactionService');
const { sendNotification } = require('./messaging');
const moment = require('moment-timezone');

jest.mock('../db/settingDB', () => ({
	getSettings: jest.fn()
}));

jest.mock('./transactionService', () => ({
	getAllTransactions: jest.fn()
}));

jest.mock('./messaging', () => ({
	sendNotification: jest.fn().mockResolvedValue(undefined)
}));

describe('paymentService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Mock console functions to keep test output clean
		jest.spyOn(console, 'log').mockImplementation(() => {});
		jest.spyOn(console, 'time').mockImplementation(() => {});
		jest.spyOn(console, 'timeEnd').mockImplementation(() => {});
	});

	describe('checkAndSendNotification', () => {
		test('should not send notification if there are no unpaid items', async () => {
			// Arrange
			const paymentList = [
				{ _id: 'paymentList', value: [{ account: 'Bank', payee: 'Payee1', category: 'Cat1', valid: true }] }
			];
			const transactions = [
				{ accountId: 'account:Bank:Bank', payee: 'Payee1', category: 'Cat1', date: moment().format('YYYY-MM-DD') }
			];
			getSettings.mockResolvedValue(paymentList);
			getAllTransactions.mockResolvedValue(transactions);

			// Act
			await checkAndSendNotification();

			// Assert
			expect(sendNotification).not.toHaveBeenCalled();
		});

		test('should send notification if there are unpaid items', async () => {
			// Arrange
			const paymentList = [
				{ _id: 'paymentList', value: [{ account: 'Bank', payee: 'Payee1', category: 'Cat1', valid: true }] }
			];
			const transactions = [];
			getSettings.mockResolvedValue(paymentList);
			getAllTransactions.mockResolvedValue(transactions);

			// Act
			await checkAndSendNotification();

			// Assert
			expect(sendNotification).toHaveBeenCalledWith('Unpaid Items Found', 'You have 1 unpaid items in your payment list.', 'receipt');
		});

		test('should not send notification for items that are not valid', async () => {
			// Arrange
			const paymentList = [
				{ _id: 'paymentList', value: [{ account: 'Bank', payee: 'Payee1', category: 'Cat1', valid: false }] }
			];
			const transactions = [];
			getSettings.mockResolvedValue(paymentList);
			getAllTransactions.mockResolvedValue(transactions);
      
			// Act
			await checkAndSendNotification();

			// Assert
			expect(sendNotification).not.toHaveBeenCalled();
		});

		test('should correctly identify paid item with subcategory', async () => {
			// Arrange
			const paymentList = [
				{ _id: 'paymentList', value: [{ account: 'Bank', payee: 'Payee1', category: 'Cat1', subcategory: 'Sub1', valid: true }] }
			];
			const transactions = [
				{ accountId: 'account:Bank:Bank', payee: 'Payee1', category: 'Cat1', subcategory: 'Sub1', date: moment().format('YYYY-MM-DD') }
			];
			getSettings.mockResolvedValue(paymentList);
			getAllTransactions.mockResolvedValue(transactions);
  
			// Act
			await checkAndSendNotification();
  
			// Assert
			expect(sendNotification).not.toHaveBeenCalled();
		});

		test('should correctly identify unpaid item with wrong subcategory', async () => {
			// Arrange
			const paymentList = [
				{ _id: 'paymentList', value: [{ account: 'Bank', payee: 'Payee1', category: 'Cat1', subcategory: 'Sub1', valid: true }] }
			];
			const transactions = [
				{ accountId: 'account:Bank:Bank', payee: 'Payee1', category: 'Cat1', subcategory: 'Sub2', date: moment().format('YYYY-MM-DD') }
			];
			getSettings.mockResolvedValue(paymentList);
			getAllTransactions.mockResolvedValue(transactions);
  
			// Act
			await checkAndSendNotification();
  
			// Assert
			expect(sendNotification).toHaveBeenCalledWith('Unpaid Items Found', 'You have 1 unpaid items in your payment list.', 'receipt');
		});

		test('should correctly identify unpaid item with wrong month', async () => {
			// Arrange
			const paymentList = [
				{ _id: 'paymentList', value: [{ account: 'Bank', payee: 'Payee1', category: 'Cat1', valid: true }] }
			];
			const transactions = [
				{ accountId: 'account:Bank:Bank', payee: 'Payee1', category: 'Cat1', date: moment().subtract(1, 'month').format('YYYY-MM-DD') }
			];
			getSettings.mockResolvedValue(paymentList);
			getAllTransactions.mockResolvedValue(transactions);
  
			// Act
			await checkAndSendNotification();
  
			// Assert
			expect(sendNotification).toHaveBeenCalledWith('Unpaid Items Found', 'You have 1 unpaid items in your payment list.', 'receipt');
		});

		test('should handle empty payment list', async () => {
			// Arrange
			const paymentList = [
				{ _id: 'paymentList', value: [] }
			];
			const transactions = [];
			getSettings.mockResolvedValue(paymentList);
			getAllTransactions.mockResolvedValue(transactions);
  
			// Act
			await checkAndSendNotification();
  
			// Assert
			expect(sendNotification).not.toHaveBeenCalled();
		});

		test('should handle no paymentList in settings', async () => {
			// Arrange
			const paymentList = [];
			const transactions = [];
			getSettings.mockResolvedValue(paymentList);
			getAllTransactions.mockResolvedValue(transactions);
  
			// Act
			await checkAndSendNotification();
  
			// Assert
			expect(sendNotification).not.toHaveBeenCalled();
		});

		test('should not send notification if today is before payment day', async () => {
			// Arrange
			const paymentList = [
				{ _id: 'paymentList', value: [{ account: 'Bank', payee: 'Payee1', category: 'Cat1', valid: true, day: moment().date() + 1 }] }
			];
			const transactions = [];
			getSettings.mockResolvedValue(paymentList);
			getAllTransactions.mockResolvedValue(transactions);

			// Act
			await checkAndSendNotification();

			// Assert
			expect(sendNotification).not.toHaveBeenCalled();
		});

		test('should send notification if today is on or after payment day and unpaid', async () => {
			// Arrange
			const paymentList = [
				{ _id: 'paymentList', value: [{ account: 'Bank', payee: 'Payee1', category: 'Cat1', valid: true, day: moment().date() }] }
			];
			const transactions = [];
			getSettings.mockResolvedValue(paymentList);
			getAllTransactions.mockResolvedValue(transactions);

			// Act
			await checkAndSendNotification();

			// Assert
			expect(sendNotification).toHaveBeenCalledWith('Unpaid Items Found', 'You have 1 unpaid items in your payment list.', 'receipt');
		});
	});
});
