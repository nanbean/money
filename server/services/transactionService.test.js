const { getAllTransactions, addTransaction } = require('./transactionService');
const transactionDB = require('../db/transactionDB');
const { updateAccount, updateAccountList } = require('./accountService');

// Mock dependencies
jest.mock('../db/transactionDB', () => ({
	getAllTransactions: jest.fn(),
	insertTransaction: jest.fn()
}));

jest.mock('./accountService', () => ({
	updateAccount: jest.fn(),
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
		test('should insert a transaction and then update its account', async () => {
			// Arrange
			const newTransaction = { _id: 'tx3', amount: 200, accountId: 'acc1' };
			transactionDB.insertTransaction.mockResolvedValue({}); // Mock successful insert
			updateAccount.mockResolvedValue(); // Mock successful update

			// Act
			await addTransaction(newTransaction);

			// Assert
			expect(transactionDB.insertTransaction).toHaveBeenCalledWith(newTransaction);
			// 거래가 바뀐 계좌만 갱신한다. 방금 넣은 거래를 함께 넘겨,
			// 로컬 복제본이 아직 안 따라왔어도 반영되게 한다.
			expect(updateAccount).toHaveBeenCalledWith('acc1', [newTransaction]);
			expect(updateAccountList).not.toHaveBeenCalled();

			// Verify that insert was called before update
			const insertOrder = transactionDB.insertTransaction.mock.invocationCallOrder[0];
			const updateOrder = updateAccount.mock.invocationCallOrder[0];
			expect(insertOrder).toBeLessThan(updateOrder);
		});

		// 어느 계좌를 고쳐야 할지 모르면 아무것도 안 하는 편보다 전체를 도는 편이 낫다.
		test('should fall back to the full recompute without an accountId', async () => {
			// Arrange
			const newTransaction = { _id: 'tx5', amount: 200 };
			transactionDB.insertTransaction.mockResolvedValue({});

			// Act
			await addTransaction(newTransaction);

			// Assert
			expect(updateAccountList).toHaveBeenCalledTimes(1);
			expect(updateAccount).not.toHaveBeenCalled();
		});

		test('should not update accounts if inserting the transaction fails', async () => {
			// Arrange
			const newTransaction = { _id: 'tx4', amount: -100, accountId: 'acc1' };
			const insertError = new Error('Insert failed');
			transactionDB.insertTransaction.mockRejectedValue(insertError);

			// Act & Assert
			await expect(addTransaction(newTransaction)).rejects.toThrow('Insert failed');
			expect(updateAccount).not.toHaveBeenCalled();
			expect(updateAccountList).not.toHaveBeenCalled();
		});
	});
});