const { getInvestmentList, getInvestmentBalance, getClosePriceWithHistory, getSymbolWithName, getGoogleSymbolWithName, getInvestmentsFromTransactions, getInvestmentsFromAccounts } = require('./investment');

describe('getInvestmentList', () => {
    // 테스트에 사용될 공통 데이터
    const allInvestments = [
        { name: 'AAPL', price: 170 }, // 현재 시장가
        { name: 'GOOG', price: 2800 },
        { name: 'TSLA', price: 750 },
    ];

    const allTransactions = [
        // 'ShrsIn' 테스트 시, 상대 거래를 찾기 위한 데이터
        { activity: 'ShrsOut', investment: 'TSLA', date: '2023-05-10', quantity: 5, price: 720 },
    ];

    test('should return an empty array if transactions are empty', () => {
        const result = getInvestmentList(allInvestments, allTransactions, []);
        expect(result).toEqual([]);
    });

    test('should correctly process a single "Buy" transaction', () => {
        const transactions = [
            { investment: 'AAPL', activity: 'Buy', quantity: 10, price: 150, amount: 1500, commission: 5 },
        ];
        const result = getInvestmentList(allInvestments, allTransactions, transactions);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            name: 'AAPL',
            quantity: 10,
            purchasedPrice: 150,
            amount: 1500,
            gain: -5, // commission
            price: 170, // current price from allInvestments
            purchasedValue: 1500, // 150 * 10
            appraisedValue: 1700, // 170 * 10
        });
    });

    test('should correctly calculate average price for multiple "Buy" transactions', () => {
        const transactions = [
            { investment: 'AAPL', activity: 'Buy', quantity: 10, price: 150, amount: 1500 },
            { investment: 'AAPL', activity: 'Buy', quantity: 10, price: 160, amount: 1600 },
        ];
        const result = getInvestmentList(allInvestments, allTransactions, transactions);

        // Average price: (150 * 10 + 160 * 10) / (10 + 10) = 155
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            name: 'AAPL',
            quantity: 20,
            purchasedPrice: 155,
            amount: 3100, // 1500 + 1600
            price: 170,
            purchasedValue: 3100, // 155 * 20
            appraisedValue: 3400, // 170 * 20
        });
    });

    test('should correctly process a "Sell" transaction', () => {
        const transactions = [
            { investment: 'GOOG', activity: 'Buy', quantity: 10, price: 2700, amount: 27000 },
            { investment: 'GOOG', activity: 'Sell', quantity: 4, price: 2900, amount: 11600, commission: 15 },
        ];
        const result = getInvestmentList(allInvestments, allTransactions, transactions);

        // Note: The gain and amount calculation logic in the source code is unconventional.
        // This test validates the logic as it is written.
        // gain = -15 (commission) - (2700*10 - 2900*4) = -15 - (27000 - 11600) = -15 - 15400 = -15415
        // amount = 27000 - 11600 = 15400
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            name: 'GOOG',
            quantity: 6, // 10 - 4
            purchasedPrice: 2700,
            amount: 15400,
            gain: -15415,
            price: 2800, // current price
            purchasedValue: 16200, // 2700 * 6
            appraisedValue: 16800, // 2800 * 6
        });
    });

    test('should reset amount to 0 when all shares are sold', () => {
        const transactions = [
            { investment: 'GOOG', activity: 'Buy', quantity: 10, price: 2700, amount: 27000 },
            { investment: 'GOOG', activity: 'Sell', quantity: 10, price: 2900, amount: 29000 },
        ];
        const result = getInvestmentList(allInvestments, allTransactions, transactions);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            name: 'GOOG',
            quantity: 0,
            amount: 0, // Should be reset to 0
        });
    });

    test('should correctly process a "ShrsIn" (Shares In) transaction', () => {
        const transactions = [
            // This transaction will get its price from the matching 'ShrsOut' in allTransactions
            { investment: 'TSLA', activity: 'ShrsIn', date: '2023-05-10', quantity: 5, amount: 3600 },
        ];
        const result = getInvestmentList(allInvestments, allTransactions, transactions);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            name: 'TSLA',
            quantity: 5,
            purchasedPrice: 720, // from matching ShrsOut in allTransactions
            amount: 3600,
            price: 750, // current price
            purchasedValue: 3600, // 720 * 5
            appraisedValue: 3750, // 750 * 5
        });
    });

    test('should correctly process a "ShrsOut" (Shares Out) transaction', () => {
        const transactions = [
            { investment: 'TSLA', activity: 'Buy', quantity: 10, price: 700, amount: 7000 },
            { investment: 'TSLA', activity: 'ShrsOut', quantity: 4, price: 730 }, // price is market price at transfer
        ];
        const result = getInvestmentList(allInvestments, allTransactions, transactions);

        // amount = 7000 - (730 * 4) = 7000 - 2920 = 4080
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            name: 'TSLA',
            quantity: 6, // 10 - 4
            purchasedPrice: 700,
            amount: 4080,
            price: 750,
        });
    });

    test('should handle investments not present in allInvestments (e.g., delisted)', () => {
        const transactions = [
            { investment: 'DELISTED', activity: 'Buy', quantity: 100, price: 10, amount: 1000 },
        ];
        // 'DELISTED' is not in allInvestments
        const result = getInvestmentList(allInvestments, allTransactions, transactions);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            name: 'DELISTED',
            quantity: 100,
            purchasedPrice: 10,
            price: 10, // Falls back to purchasedPrice
            purchasedValue: 1000,
            appraisedValue: 1000, // Falls back to purchasedValue
        });
    });

    test('should handle a complex mix of transactions for multiple stocks', () => {
        const transactions = [
            { investment: 'AAPL', activity: 'Buy', quantity: 10, price: 150, amount: 1500 },
            { investment: 'GOOG', activity: 'Buy', quantity: 5, price: 2700, amount: 13500 },
            { investment: 'AAPL', activity: 'Sell', quantity: 3, price: 160, amount: 480 },
            { investment: 'AAPL', activity: 'Buy', quantity: 5, price: 155, amount: 775 },
        ];
        const result = getInvestmentList(allInvestments, allTransactions, transactions);

        expect(result).toHaveLength(2);

        const appleStock = result.find(s => s.name === 'AAPL');
        const googleStock = result.find(s => s.name === 'GOOG');

        // AAPL: 10 - 3 + 5 = 12 shares
        expect(appleStock.quantity).toBe(12);
        // GOOG: 5 shares
        expect(googleStock.quantity).toBe(5);
        expect(googleStock.purchasedPrice).toBe(2700);
    });
});

describe('getInvestmentBalance', () => {
    test('should return 0 for an empty investment list', () => {
        const investments = [];
        expect(getInvestmentBalance(investments)).toBe(0);
    });

    test('should return 0 if the investment list is null or undefined', () => {
        expect(getInvestmentBalance(null)).toBe(0);
        expect(getInvestmentBalance(undefined)).toBe(0);
    });

    test('should calculate the correct balance for a single investment', () => {
        const investments = [
            { name: 'AAPL', price: 170, quantity: 10 } // 170 * 10 = 1700
        ];
        expect(getInvestmentBalance(investments)).toBe(1700);
    });

    test('should calculate the correct balance for multiple investments', () => {
        const investments = [
            { name: 'AAPL', price: 170, quantity: 10 }, // 1700
            { name: 'GOOG', price: 2800, quantity: 2 }, // 5600
            { name: 'TSLA', price: 750, quantity: 5 }   // 3750
        ];
        // Total = 1700 + 5600 + 3750 = 11050
        expect(getInvestmentBalance(investments)).toBe(11050);
    });

    test('should handle investments with missing price or quantity gracefully', () => {
        const investments = [
            { name: 'AAPL', price: 170, quantity: 10 }, // 1700
            { name: 'GOOG', quantity: 5 },              // price is missing, should be 0
            { name: 'TSLA', price: 750 }                // quantity is missing, should be 0
        ];
        expect(getInvestmentBalance(investments)).toBe(1700);
    });
});

describe('getClosePriceWithHistory', () => {
    const investments = [
        { _id: 'investment:AAPL', name: 'Apple Inc.', price: 170.50 },
        { _id: 'investment:GOOG', name: 'Alphabet Inc.', price: 2800.75 },
        { _id: 'investment:TSLA', name: 'Tesla Inc.', price: 750.25 },
    ];

    test('should return 0 if investments is null or undefined', () => {
        const history = { _id: 'history:AAPL' };
        expect(getClosePriceWithHistory(null, history)).toBe(0);
        expect(getClosePriceWithHistory(undefined, history)).toBe(0);
    });

    test('should return 0 if history is null or undefined', () => {
        expect(getClosePriceWithHistory(investments, null)).toBe(0);
        expect(getClosePriceWithHistory(investments, undefined)).toBe(0);
    });

    test('should return 0 if no matching investment is found', () => {
        const history = { _id: 'history:MSFT' }; // MSFT is not in investments list
        expect(getClosePriceWithHistory(investments, history)).toBe(0);
    });

    test('should return the correct price for a matching investment', () => {
        const history = { _id: 'history:AAPL' };
        expect(getClosePriceWithHistory(investments, history)).toBe(170.50);
    });

    test('should handle different history _id formats correctly', () => {
        const history1 = { _id: 'history:GOOG' };
        expect(getClosePriceWithHistory(investments, history1)).toBe(2800.75);

        const history2 = { _id: 'history:TSLA' };
        expect(getClosePriceWithHistory(investments, history2)).toBe(750.25);
    });
});

describe('getSymbolWithName', () => {
    const investments = [
        { name: 'Apple Inc.', yahooSymbol: 'AAPL.OQ' }, // Symbol longer than 6 chars
        { name: 'Alphabet Inc.', yahooSymbol: 'GOOGL' }, // Symbol shorter than 6 chars
        { name: 'Samsung Electronics', yahooSymbol: '005930.KS' },
        { name: 'Microsoft Corp.', price: 250 } // No yahooSymbol property
    ];

    test('should return the first 6 characters of the yahooSymbol for a matching investment', () => {
        expect(getSymbolWithName(investments, 'Apple Inc.')).toBe('AAPL.O');
        expect(getSymbolWithName(investments, 'Samsung Electronics')).toBe('005930');
    });

    test('should return the full yahooSymbol if it is shorter than 6 characters', () => {
        expect(getSymbolWithName(investments, 'Alphabet Inc.')).toBe('GOOGL');
    });

    test('should return an empty string if no matching investment is found', () => {
        expect(getSymbolWithName(investments, 'NonExistent Corp.')).toBe('');
    });

    test('should return an empty string if the matching investment has no yahooSymbol', () => {
        expect(getSymbolWithName(investments, 'Microsoft Corp.')).toBe('');
    });

    test('should return an empty string for invalid arguments', () => {
        expect(getSymbolWithName(null, 'Apple Inc.')).toBe('');
        expect(getSymbolWithName(undefined, 'Apple Inc.')).toBe('');
        expect(getSymbolWithName(investments, null)).toBe('');
        expect(getSymbolWithName(investments, undefined)).toBe('');
    });
});

describe('getGoogleSymbolWithName', () => {
    const investments = [
        { name: 'Apple Inc.', googleSymbol: 'NASDAQ:AAPL' },
        { name: 'Alphabet Inc.', googleSymbol: 'NASDAQ:GOOGL' },
        { name: 'LG전자', googleSymbol: 'KRX:066570', yahooSymbol: '066570.KS' },
        { name: 'Samsung Electronics', yahooSymbol: '005930.KS' }, // No googleSymbol
        { name: 'Microsoft Corp.', price: 250 } // No googleSymbol property
    ];

    test('should return the googleSymbol for a matching investment', () => {
        expect(getGoogleSymbolWithName(investments, 'Apple Inc.')).toBe('NASDAQ:AAPL');
        expect(getGoogleSymbolWithName(investments, 'Alphabet Inc.')).toBe('NASDAQ:GOOGL');
        expect(getGoogleSymbolWithName(investments, 'LG전자')).toBe('KRX:066570');
    });

    test('should return an empty string if no matching investment is found', () => {
        expect(getGoogleSymbolWithName(investments, 'NonExistent Corp.')).toBe('');
    });

    test('should return an empty string if the matching investment has no googleSymbol', () => {
        expect(getGoogleSymbolWithName(investments, 'Samsung Electronics')).toBe('');
        expect(getGoogleSymbolWithName(investments, 'Microsoft Corp.')).toBe('');
    });

    test('should return an empty string for invalid arguments', () => {
        expect(getGoogleSymbolWithName(null, 'Apple Inc.')).toBe('');
        expect(getGoogleSymbolWithName(investments, undefined)).toBe('');
    });
});

describe('getInvestmentsFromTransactions', () => {
    const mockMasterInvestments = [
        { name: 'Apple', yahooSymbol: 'AAPL.OQ' },
        { name: 'Google', yahooSymbol: 'GOOGL' },
        { name: 'Microsoft' } // No yahooSymbol
    ];

    test('should extract and format investment transactions correctly', () => {
        const mockTransactions = [
            { accountId: 'account:Invst:Broker1', investment: 'Apple' },
            { accountId: 'account:Cash:Bank1', investment: 'N/A' }, // Should be ignored
            { accountId: 'account:Invst:Broker2', investment: 'Google' },
            { accountId: 'account:Invst:Broker1', investment: 'Apple' }, // Duplicate is intentional
        ];

        const result = getInvestmentsFromTransactions(mockMasterInvestments, mockTransactions);

        expect(result).toHaveLength(3);
        expect(result).toEqual(expect.arrayContaining([
            { _id: 'history:AAPL.O', name: 'Apple' },
            { _id: 'history:GOOGL', name: 'Google' }
        ]));
        // Check for the duplicate
        expect(result.filter(r => r.name === 'Apple').length).toBe(2);
    });

    test('should return an empty array if no investment transactions are found', () => {
        const mockTransactions = [
            { accountId: 'account:Cash:Bank1', investment: 'N/A' },
            { accountId: 'account:Oth L:Loan1', investment: 'N/A' },
        ];
        const result = getInvestmentsFromTransactions(mockMasterInvestments, mockTransactions);
        expect(result).toEqual([]);
    });

    test('should handle transactions for investments without a yahooSymbol', () => {
        const mockTransactions = [
            { accountId: 'account:Invst:Broker1', investment: 'Microsoft' }
        ];
        const result = getInvestmentsFromTransactions(mockMasterInvestments, mockTransactions);
        expect(result).toEqual([{ _id: 'history:', name: 'Microsoft' }]);
    });

    test('should return an empty array for invalid or empty inputs', () => {
        expect(getInvestmentsFromTransactions(null, [])).toEqual([]);
        expect(getInvestmentsFromTransactions(mockMasterInvestments, undefined)).toEqual([]);
        expect(getInvestmentsFromTransactions(mockMasterInvestments, [])).toEqual([]);
    });
});

describe('getInvestmentsFromAccounts', () => {
    const mockMasterInvestments = [
        { name: 'Apple', googleSymbol: 'NASDAQ:AAPL' },
        { name: 'Google', googleSymbol: 'NASDAQ:GOOGL' },
        { name: 'Tesla', yahooSymbol: 'TSLA' }, // No googleSymbol
    ];

    test('should correctly aggregate investments from multiple accounts', () => {
        const mockAccounts = [
            {
                name: 'Brokerage A',
                investments: [
                    { name: 'Apple', quantity: 10 },
                    { name: 'Google', quantity: 5 }
                ]
            },
            {
                name: 'Brokerage B',
                investments: [
                    { name: 'Apple', quantity: 15 }, // Duplicate investment
                    { name: 'Tesla', quantity: 20 }
                ]
            },
            { name: 'Cash Account', investments: [] } // Account with no investments
        ];

        const result = getInvestmentsFromAccounts(mockMasterInvestments, mockAccounts);

        expect(result).toHaveLength(3);
        expect(result).toEqual(expect.arrayContaining([
            { name: 'Apple', quantity: 25, googleSymbol: 'NASDAQ:AAPL' }, // 10 + 15
            { name: 'Google', quantity: 5, googleSymbol: 'NASDAQ:GOOGL' },
            { name: 'Tesla', quantity: 20, googleSymbol: '' } // No googleSymbol exists
        ]));
    });

    test('should filter out investments not present in the master list', () => {
        const mockAccounts = [{
            name: 'Brokerage A',
            investments: [
                { name: 'Apple', quantity: 10 },
                { name: 'Nvidia', quantity: 5 } // This one is not in mockMasterInvestments
            ]
        }];

        const result = getInvestmentsFromAccounts(mockMasterInvestments, mockAccounts);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ name: 'Apple', quantity: 10 });
    });

    test('should return an empty array for invalid or empty inputs', () => {
        const mockAccounts = [{ name: 'Brokerage A', investments: [{ name: 'Apple', quantity: 10 }] }];
        expect(getInvestmentsFromAccounts(null, mockAccounts)).toEqual([]);
        expect(getInvestmentsFromAccounts(mockMasterInvestments, undefined)).toEqual([]);
        expect(getInvestmentsFromAccounts(mockMasterInvestments, [])).toEqual([]);
    });
});