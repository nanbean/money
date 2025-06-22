const { getAllTransactions, addTransaction } = require('./transactionService');
const { transactionsDB } = require('../db');
const { updateAccountList } = require('./accountService');

// Mock dependencies
jest.mock('../db', () => ({
	transactionsDB: {
		list: jest.fn(),
		insert: jest.fn()
	}
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
		test('should return all transaction documents', async () => {
			// Arrange
			const mockDbResponse = {
				rows: [
					{ doc: { _id: 'tx1', amount: 100 } },
					{ doc: { _id: 'tx2', amount: -50 } }
				]
			};
			transactionsDB.list.mockResolvedValue(mockDbResponse);

			// Act
			const transactions = await getAllTransactions();

			// Assert
			expect(transactionsDB.list).toHaveBeenCalledWith({ include_docs: true });
			expect(transactions).toHaveLength(2);
			expect(transactions).toEqual(mockDbResponse.rows.map(row => row.doc));
		});

		test('should return an empty array if there are no transactions', async () => {
			// Arrange
			transactionsDB.list.mockResolvedValue({ rows: [] });

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
			transactionsDB.insert.mockResolvedValue({}); // Mock successful insert
			updateAccountList.mockResolvedValue(); // Mock successful update

			// Act
			await addTransaction(newTransaction);

			// Assert
			expect(transactionsDB.insert).toHaveBeenCalledWith(newTransaction);
			expect(updateAccountList).toHaveBeenCalledTimes(1);

			// Verify that insert was called before update
			const insertOrder = transactionsDB.insert.mock.invocationCallOrder[0];
			const updateOrder = updateAccountList.mock.invocationCallOrder[0];
			expect(insertOrder).toBeLessThan(updateOrder);
		});

		test('should not call updateAccountList if inserting the transaction fails', async () => {
			// Arrange
			const newTransaction = { _id: 'tx4', amount: -100 };
			const insertError = new Error('Insert failed');
			transactionsDB.insert.mockRejectedValue(insertError);

			// Act & Assert
			await expect(addTransaction(newTransaction)).rejects.toThrow('Insert failed');
			expect(updateAccountList).not.toHaveBeenCalled();
		});
	});
});