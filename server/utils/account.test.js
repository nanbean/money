const { getBalance } = require('./account');

describe('getBalance', () => {
	// Test case for a regular account (non-cash account)
	test('should calculate the correct balance for a regular account', () => {
		const name = 'MyBank';
		const transactions = [
			{ amount: 100 },
			{ amount: -50 },
			{ amount: 200 }
		];
		// investmentTransactions should be ignored for regular accounts
		const investmentTransactions = [
			{ activity: 'Buy', amount: 1000 }
		];
		const balance = getBalance(name, transactions, investmentTransactions);
		expect(balance).toBe(250); // 100 - 50 + 200
	});

	test('should return 0 for a regular account with no transactions', () => {
		const name = 'MyBank';
		const transactions = [];
		const balance = getBalance(name, transactions);
		expect(balance).toBe(0);
	});

	// Test cases for an investment cash account
	test('should calculate the correct balance for an investment cash account', () => {
		const name = 'MyBrokerage_Cash';
		const transactions = [
			{ amount: 5000 }, // Initial deposit
			{ amount: -1000 } // Withdrawal
		];
		const investmentTransactions = [
			{ activity: 'Buy', amount: 2000 },
			{ activity: 'Sell', amount: 500 },
			{ activity: 'Div', amount: 50 },
			{ activity: 'MiscExp', amount: 10 }
		];
		// Balance from cash account transactions: 5000 - 1000 = 4000
		// Adjustments from investment transactions: -2000 (Buy) + 500 (Sell) + 50 (Div) - 10 (MiscExp) = -1460
		// Final balance: 4000 - 1460 = 2540
		const balance = getBalance(name, transactions, investmentTransactions);
		expect(balance).toBe(2540);
	});

	test('should handle an investment cash account with no investment transactions', () => {
		const name = 'MyBrokerage_Cash';
		const transactions = [
			{ amount: 5000 },
			{ amount: -1000 }
		];
		const balance = getBalance(name, transactions, []);
		expect(balance).toBe(4000);
	});

	test('should handle an investment cash account when investmentTransactions is undefined', () => {
		const name = 'MyBrokerage_Cash';
		const transactions = [
			{ amount: 5000 },
			{ amount: -1000 }
		];
		const balance = getBalance(name, transactions);
		expect(balance).toBe(4000);
	});

	// Edge case
	test('should handle transactions array with null/undefined entries gracefully', () => {
		const name = 'MyBank';
		const transactions = [
			{ amount: 100 },
			null,
			{ amount: -50 },
			undefined
		];
		const balance = getBalance(name, transactions);
		expect(balance).toBe(50);
	});
});