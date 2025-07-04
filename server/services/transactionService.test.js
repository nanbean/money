const { getAllTransactions, addTransaction } = require('./transactionService');
const transactionDB = require('../db/transactionDB');
const { updateAccountList } = require('./accountService');

// Mock dependencies
jest.mock('../db/transactionDB', () => ({
	getAllTransactions: jest.fn(),
	insertTransaction: jest.fn()
}));

jest.mock('./accountService', () => ({
	updateAccountList: jest.fn()
}));

describe('transactionService', () => {
	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();
	});

	describe('getAllTransactions', () => {
		test('should call transactionDB.getAllTransactions and return its result', async () => {
			// Arrange
			const mockTransactions = [
				{ _id: 'tx1', amount: 100 },
				{ _id: 'tx2', amount: -50 }
			];
			transactionDB.getAllTransactions.mockResolvedValue(mockTransactions);

			// Act
			const transactions = await getAllTransactions();

			// Assert
			expect(transactionDB.getAllTransactions).toHaveBeenCalledTimes(1);
			expect(transactions).toEqual(mockTransactions);
		});

		test('should return an empty array if there are no transactions', async () => {
			// Arrange
			transactionDB.getAllTransactions.mockResolvedValue([]);

			// Act
			const transactions = await getAllTransactions();

			// Assert
			expect(transactions).toEqual([]);
		});
	});

	describe('addTransaction', () => {
		test('should insert a transaction and then update the account list', async () => {
			// Arrange
			const newTransaction = { _id: 'tx3', amount: 200, accountId: 'acc1' };
			transactionDB.insertTransaction.mockResolvedValue({}); // Mock successful insert
			updateAccountList.mockResolvedValue(); // Mock successful update

			// Act
			await addTransaction(newTransaction);

			// Assert
			expect(transactionDB.insertTransaction).toHaveBeenCalledWith(newTransaction);
			expect(updateAccountList).toHaveBeenCalledTimes(1);

			// Verify that insert was called before update
			const insertOrder = transactionDB.insertTransaction.mock.invocationCallOrder[0];
			const updateOrder = updateAccountList.mock.invocationCallOrder[0];
			expect(insertOrder).toBeLessThan(updateOrder);
		});

		test('should not call updateAccountList if inserting the transaction fails', async () => {
			// Arrange
			const newTransaction = { _id: 'tx4', amount: -100 };
			const insertError = new Error('Insert failed');
			transactionDB.insertTransaction.mockRejectedValue(insertError);

			// Act & Assert
			await expect(addTransaction(newTransaction)).rejects.toThrow('Insert failed');
			expect(updateAccountList).not.toHaveBeenCalled();
		});
	});
});