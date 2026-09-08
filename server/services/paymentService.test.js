const checkAndSendNotification = require('./paymentService');
const { getSettings } = require('../db/settingDB');
const { getAllTransactions } = require('./transactionService');
const { sendNotification } = require('./messaging');
const moment = require('moment-timezone');
const { isPaid } = require('./paymentService');
const { NOW, PAID_CASES } = require('../fixtures/paidCases');

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

// isPaid 는 클라이언트(src/setting/PaymentList/paymentPaid.js)의 isPaymentPaid
// 와 같은 규칙이어야 한다. 두 구현이 갈라지면 화면의 '납부' 표시와 여기서
// 보내는 '미납 N건' 푸시가 어긋난다. 그래서 사례 표를 한 곳에 두고 양쪽이
// 같이 돌린다.
//
// isPaid 는 moment() 를 직접 부르므로 시계를 고정한다. 정오로 잡아 시간대가
// 달라도 날짜가 넘어가지 않게 한다.
describe('isPaid — 클라이언트와 공유하는 사례', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date(`${NOW}T12:00:00Z`));
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test.each(PAID_CASES.map((c) => [c.label, c]))('%s', (_label, c) => {
		expect(isPaid(c.payment, c.transactions)).toBe(c.expected);
	});
});
