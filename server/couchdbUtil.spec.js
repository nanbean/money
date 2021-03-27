const couchdbUtil = require('./couchdbUtil');

describe('couchdbUtil', () => {
	describe('getClosePriceWithHistory', () => {
		it('should return 0 when investments is not present', () => {
			expect(couchdbUtil.getClosePriceWithHistory()).toBe(0);
		});

		it('should return 0 when history is not present', () => {
			const investements = [];
			expect(couchdbUtil.getClosePriceWithHistory(investements)).toBe(0);
		});

		it('should return price when history is matched', () => {
			const investements = [
				{
					"_id": "investment:123456",
					"name": "TESTSTOCK",
					"googleSymbol": "KRX:123456",
					"yahooSymbol": "123456.KS",
					"price": 1000
				},
				{
					"_id": "investment:654321",
					"name": "TESTSTOCK2",
					"googleSymbol": "KRX:654321",
					"yahooSymbol": "654321.KS",
					"price": 2000
				}
			];
			const history = {
				"_id": "history:123456",
				"name": "TESTSTOCK"
			};

			expect(couchdbUtil.getClosePriceWithHistory(investements, history)).toBe(1000);
		});
	});

	describe('getSymbolWithName', () => {
		it('should return empty string when investments is not present', () => {
			expect(couchdbUtil.getSymbolWithName()).toBe('');
		});
		
		it('should return empty string when the name is not present', () => {
			const investements = [];
			expect(couchdbUtil.getSymbolWithName(investements)).toBe('');
		});

		it('should return symbol when the name is present', () => {
			const investements = [
				{
					"_id": "investment:123456",
					"name": "TESTSTOCK",
					"googleSymbol": "KRX:123456",
					"yahooSymbol": "123456.KS",
					"price": 1000
				}
			];
			expect(couchdbUtil.getSymbolWithName(investements, 'TESTSTOCK')).toBe('123456');
		});
	});

	describe('getInvestmentsFromTransactions', () => {
		it('should return empty array when transactions is not present', () => {
			expect(couchdbUtil.getInvestmentsFromTransactions()).toEqual([]);
		});

		it('should return empty array when transactions is not present', () => {
			expect(couchdbUtil.getInvestmentsFromTransactions()).toEqual([]);
		});
		
		it('should return investements when transactions is present', () => {
			const investements = [
				{
					"_id": "investment:123456",
					"name": "TESTSTOCK",
					"googleSymbol": "KRX:123456",
					"yahooSymbol": "123456.KS",
					"price": 1000
				},
				{
					"_id": "investment:654321",
					"name": "TESTSTOCK2",
					"googleSymbol": "KRX:654321",
					"yahooSymbol": "654321.KS",
					"price": 2000
				}
			];
			const transactions = [
				{
					"date": "2005-01-07",
					"amount": 441790,
					"activity": "Buy",
					"investment": "TESTSTOCK",
					"price": 440500,
					"quantity": 1,
					"accountId": "account:Invst:TestInvest"
				}
			];
			expect(couchdbUtil.getInvestmentsFromTransactions(investements, transactions)).toEqual([{_id: 'histories:123456', name: 'TESTSTOCK'}]);
		});
	});
});