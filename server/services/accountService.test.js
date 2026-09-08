const { getAllAccounts, updateAccountList, repriceAccounts } = require('./accountService');
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
		jest.spyOn(console, 'log').mockImplementation(() => {});
		jest.spyOn(console, 'time').mockImplementation(() => {});
		jest.spyOn(console, 'timeEnd').mockImplementation(() => {});
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
	// 시세만 바뀐 경우의 경로. 거래를 읽지 않는 것이 핵심이다.
	//
	// 실측(2026-09): 계좌별 재계산은 38ms 인데 거래 전체 읽기가 11.8 MB · 789ms
	// 다. 아끼는 건 계산이 아니라 읽기다.
	describe('repriceAccounts', () => {
		const stocks = (rows) => {
			stocksDB.get.mockImplementation((id) => Promise.resolve(
				id === 'kospi' ? { data: rows } : { data: [] }
			));
		};

		const account = (over) => ({
			_id: 'account:Invst:Broker',
			name: 'Broker',
			type: 'Invst',
			cashAccountId: 'account:Bank:Broker_Cash',
			cashBalance: 1000,
			balance: 0,
			investments: [
				{ name: 'AAA', quantity: 10, price: 100, purchasedPrice: 90, purchasedValue: 900, appraisedValue: 1000, gain: 50 }
			],
			...over
		});

		test('새 가격으로 평가액과 잔액을 다시 계산한다', async () => {
			// Arrange
			accountsDB.list.mockResolvedValue({ rows: [{ doc: account() }] });
			stocks([{ name: 'AAA', price: 120 }]);

			// Act
			await repriceAccounts();

			// Assert
			const [{ docs }] = accountsDB.bulk.mock.calls[0];
			expect(docs).toHaveLength(1);
			expect(docs[0].investments[0]).toMatchObject({ price: 120, appraisedValue: 1200 });
			// 10 × 120 + cashBalance 1000
			expect(docs[0].balance).toBe(2200);
		});

		// 가격과 무관한 값이 재계산으로 사라지면 취득가·손익이 망가진다.
		test('가격과 무관한 값은 그대로 둔다', async () => {
			// Arrange
			accountsDB.list.mockResolvedValue({ rows: [{ doc: account() }] });
			stocks([{ name: 'AAA', price: 120 }]);

			// Act
			await repriceAccounts();

			// Assert
			expect(accountsDB.bulk.mock.calls[0][0].docs[0].investments[0]).toMatchObject({
				quantity: 10,
				purchasedPrice: 90,
				purchasedValue: 900,
				gain: 50
			});
		});

		// 거래를 읽지 않는 것이 이 경로의 존재 이유다.
		test('거래를 읽지 않는다', async () => {
			// Arrange
			accountsDB.list.mockResolvedValue({ rows: [{ doc: account() }] });
			stocks([{ name: 'AAA', price: 120 }]);

			// Act
			await repriceAccounts();

			// Assert
			expect(pouchdb.getAllTransactions).not.toHaveBeenCalled();
		});

		// 상장폐지·이름 변경 한 건이 자산 총액을 깎으면 안 된다.
		test('시세에 없는 종목은 이전 가격을 유지한다', async () => {
			// Arrange: AAA 는 시세에 없고 BBB 만 움직인다.
			accountsDB.list.mockResolvedValue({
				rows: [{ doc: account({
					investments: [
						{ name: 'AAA', quantity: 10, price: 100, appraisedValue: 1000 },
						{ name: 'BBB', quantity: 1, price: 50, appraisedValue: 50 }
					]
				}) }]
			});
			stocks([{ name: 'BBB', price: 70 }]);

			// Act
			await repriceAccounts();

			// Assert
			const [aaa, bbb] = accountsDB.bulk.mock.calls[0][0].docs[0].investments;
			expect(aaa).toMatchObject({ price: 100, appraisedValue: 1000 });
			expect(bbb).toMatchObject({ price: 70, appraisedValue: 70 });
		});

		test('비투자 계좌는 건드리지 않는다', async () => {
			// Arrange
			accountsDB.list.mockResolvedValue({
				rows: [
					{ doc: { _id: 'account:Bank:급여계좌', name: '급여계좌', type: 'Bank', balance: 500 } },
					{ doc: { _id: 'account:CCard:KB카드', name: 'KB카드', type: 'CCard', balance: -100 } }
				]
			});
			stocks([{ name: 'AAA', price: 120 }]);

			// Act
			await repriceAccounts();

			// Assert
			expect(accountsDB.bulk).not.toHaveBeenCalled();
		});

		// 안 바뀐 문서를 쓰면 _rev 만 올라가고 클라이언트가 헛 동기화를 한다.
		test('값이 그대로면 쓰지 않는다', async () => {
			// Arrange
			accountsDB.list.mockResolvedValue({ rows: [{ doc: account({ balance: 2000 }) }] });
			stocks([{ name: 'AAA', price: 100 }]);

			// Act
			await repriceAccounts();

			// Assert
			expect(accountsDB.bulk).not.toHaveBeenCalled();
		});

		test('바뀐 계좌만 쓴다', async () => {
			// Arrange
			accountsDB.list.mockResolvedValue({
				rows: [
					{ doc: account({ _id: 'account:Invst:A', balance: 2000 }) },
					{ doc: account({ _id: 'account:Invst:B' }) }
				]
			});
			stocks([{ name: 'AAA', price: 100 }]);

			// Act
			await repriceAccounts();

			// Assert
			const [{ docs }] = accountsDB.bulk.mock.calls[0];
			expect(docs.map(d => d._id)).toEqual(['account:Invst:B']);
		});

		// quantity 0 은 보유가 없다는 뜻이다. 잔액에 들어가면 안 된다.
		test('수량 0 은 잔액에 넣지 않는다', async () => {
			// Arrange
			accountsDB.list.mockResolvedValue({
				rows: [{ doc: account({
					investments: [
						{ name: 'AAA', quantity: 0, price: 100, appraisedValue: 0 },
						{ name: 'BBB', quantity: 5, price: 200, appraisedValue: 1000 }
					]
				}) }]
			});
			stocks([{ name: 'AAA', price: 999 }, { name: 'BBB', price: 200 }]);

			// Act
			await repriceAccounts();

			// Assert
			// 5 × 200 + cashBalance 1000
			expect(accountsDB.bulk.mock.calls[0][0].docs[0].balance).toBe(2000);
		});

		test('보유 종목이 없어도 죽지 않는다', async () => {
			// Arrange
			accountsDB.list.mockResolvedValue({
				rows: [{ doc: account({ investments: undefined, balance: 1000 }) }]
			});
			stocks([{ name: 'AAA', price: 120 }]);

			// Act & Assert
			await expect(repriceAccounts()).resolves.toBeUndefined();
			expect(accountsDB.bulk).not.toHaveBeenCalled();
		});

		// cashBalance 는 거래에만 의존한다. 저장된 값을 쓴다.
		test('cashBalance 가 없으면 0 으로 본다', async () => {
			// Arrange
			accountsDB.list.mockResolvedValue({
				rows: [{ doc: account({ cashBalance: undefined }) }]
			});
			stocks([{ name: 'AAA', price: 120 }]);

			// Act
			await repriceAccounts();

			// Assert
			expect(accountsDB.bulk.mock.calls[0][0].docs[0].balance).toBe(1200);
		});

		// 읽기가 실패해도 요청 전체가 죽으면 안 된다.
		test('읽기 실패를 삼킨다', async () => {
			// Arrange
			jest.spyOn(console, 'error').mockImplementation(() => {});
			accountsDB.list.mockRejectedValue(new Error('boom'));

			// Act & Assert
			await expect(repriceAccounts()).resolves.toBeUndefined();
			expect(accountsDB.bulk).not.toHaveBeenCalled();
		});
	});

});
