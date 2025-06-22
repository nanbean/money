const { getKisToken, getKisQuoteKorea, getKisQuoteUS, getKisExchangeRate } = require('./kisConnector');
const localdb = require('node-persist');
const moment = require('moment-timezone');

// Mock node-persist
jest.mock('node-persist', () => ({
	create: jest.fn().mockReturnThis(),
	init: jest.fn(),
	getItem: jest.fn(),
	setItem: jest.fn()
}));

// Mock global fetch
global.fetch = jest.fn();

describe('kisConnector', () => {
	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();
		// Reset fetch mock
		fetch.mockClear();
		// Use fake timers to control moment()
		jest.useFakeTimers();
	});

	afterEach(() => {
		// Restore real timers
		jest.useRealTimers();
	});

	describe('getKisToken', () => {
		test('should fetch a new token if none is cached', async () => {
			// Arrange
			localdb.getItem.mockResolvedValue(null); // No token in cache
			const mockApiResponse = {
				access_token: 'new-fake-token',
				access_token_token_expired: '2025-01-01 10:00:00',
			};
			fetch.mockResolvedValueOnce({
				json: () => Promise.resolve(mockApiResponse),
			});

			// Act
			const token = await getKisToken();

			// Assert
			expect(localdb.getItem).toHaveBeenCalledWith('access_token');
			expect(fetch).toHaveBeenCalledTimes(1);
			expect(fetch).toHaveBeenCalledWith(
				'https://openapi.koreainvestment.com:9443/oauth2/tokenP',
				expect.any(Object)
			);
			expect(localdb.setItem).toHaveBeenCalledWith('access_token', 'new-fake-token');
			expect(localdb.setItem).toHaveBeenCalledWith('access_token_token_expired', '2025-01-01 10:00:00');
			expect(token).toBe('new-fake-token');
		});

		test('should return a cached token if it is valid and not expired', async () => {
			// Arrange
			jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
			localdb.getItem
				.mockResolvedValueOnce('cached-fake-token') // for access_token
				.mockResolvedValueOnce('2024-01-02 00:00:00'); // for expiry

			// Act
			const token = await getKisToken();

			// Assert
			expect(localdb.getItem).toHaveBeenCalledWith('access_token');
			expect(localdb.getItem).toHaveBeenCalledWith('access_token_token_expired');
			expect(fetch).not.toHaveBeenCalled();
			expect(token).toBe('cached-fake-token');
		});

		test('should fetch a new token if the cached token is expired', async () => {
			// Arrange
			jest.setSystemTime(new Date('2024-01-03T12:00:00Z')); // Current time is after expiry
			localdb.getItem
				.mockResolvedValueOnce('expired-fake-token') // for access_token
				.mockResolvedValueOnce('2024-01-02 00:00:00'); // for expiry

			const mockApiResponse = {
				access_token: 'new-fresh-token',
				access_token_token_expired: '2024-01-04 00:00:00',
			};
			fetch.mockResolvedValueOnce({
				json: () => Promise.resolve(mockApiResponse),
			});

			// Act
			const token = await getKisToken();

			// Assert
			expect(fetch).toHaveBeenCalledTimes(1);
			expect(localdb.setItem).toHaveBeenCalledWith('access_token', 'new-fresh-token');
			expect(localdb.setItem).toHaveBeenCalledWith('access_token_token_expired', '2024-01-04 00:00:00');
			expect(token).toBe('new-fresh-token');
		});
	});

	describe('getKisQuoteKorea', () => {
		test('should fetch Korean stock price correctly', async () => {
			// Arrange
			const mockAccessToken = 'fake-kr-token';
			const mockGoogleSymbol = 'KRX:005930';
			const mockApiResponse = {
				rt_cd: '0',
				output: { stck_prpr: '75000' }
			};
			fetch.mockResolvedValueOnce({
				json: () => Promise.resolve(mockApiResponse),
			});

			// Act
			const result = await getKisQuoteKorea(mockAccessToken, mockGoogleSymbol);

			// Assert
			expect(fetch).toHaveBeenCalledTimes(1);
			const expectedUrl = `https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price?fid_cond_mrkt_div_code=J&fid_input_iscd=005930`;
			const fetchCall = fetch.mock.calls[0];
			expect(fetchCall[0]).toBe(expectedUrl);
			expect(fetchCall[1].headers.authorization).toBe(`Bearer ${mockAccessToken}`);
			expect(fetchCall[1].headers.tr_id).toBe('FHKST01010100');

			expect(result).toEqual({ ...mockApiResponse, googleSymbol: mockGoogleSymbol });
		});
	});

	describe('getKisQuoteUS', () => {
		test('should use day market exchange code during US day market hours', async () => {
			// Arrange
			// Set time to 21:00 New York time (day market)
			jest.setSystemTime(new Date('2024-01-01T21:00:00-05:00'));
			const mockAccessToken = 'fake-us-token';
			const mockGoogleSymbol = 'NASDAQ:AAPL';
			fetch.mockResolvedValueOnce({ json: () => Promise.resolve({}) });

			// Act
			await getKisQuoteUS(mockAccessToken, mockGoogleSymbol);

			// Assert
			const fetchUrl = fetch.mock.calls[0][0];
			expect(fetchUrl).toContain('EXCD=BAQ'); // BAQ for NASDAQ day market
		});

		test('should use regular market exchange code outside US day market hours', async () => {
			// Arrange
			// Set time to 13:00 New York time (pre-market)
			jest.setSystemTime(new Date('2024-01-01T13:00:00-05:00'));
			const mockAccessToken = 'fake-us-token';
			const mockGoogleSymbol = 'NYSE:IBM';
			fetch.mockResolvedValueOnce({ json: () => Promise.resolve({}) });

			// Act
			await getKisQuoteUS(mockAccessToken, mockGoogleSymbol);

			// Assert
			const fetchUrl = fetch.mock.calls[0][0];
			expect(fetchUrl).toContain('EXCD=NYS'); // NYS for NYSE regular market
		});
	});

	describe('getKisExchangeRate', () => {
		test('should fetch and parse the exchange rate correctly', async () => {
			// Arrange
			const mockAccessToken = 'fake-exchange-token';
			const mockApiResponse = {
				rt_cd: '0',
				output2: [{ frst_bltn_exrt: '1350.50' }]
			};
			fetch.mockResolvedValueOnce({
				json: () => Promise.resolve(mockApiResponse),
			});

			// Act
			const rate = await getKisExchangeRate(mockAccessToken);

			// Assert
			expect(fetch).toHaveBeenCalledTimes(1);
			const fetchCall = fetch.mock.calls[0];
			expect(fetchCall[0]).toContain('/uapi/overseas-stock/v1/trading/inquire-present-balance');
			expect(fetchCall[1].headers.authorization).toBe(`Bearer ${mockAccessToken}`);
			expect(fetchCall[1].headers.tr_id).toBe('CTRP6504R');

			expect(rate).toBe(1350.50);
		});

		test('should return NaN if the exchange rate is not in the response', async () => {
			// Arrange
			const mockAccessToken = 'fake-exchange-token';
			const mockApiResponse = {
				rt_cd: '1',
				output2: [] // Missing exchange rate data
			};
			fetch.mockResolvedValueOnce({
				json: () => Promise.resolve(mockApiResponse),
			});

			// Act
			const rate = await getKisExchangeRate(mockAccessToken);

			// Assert
			expect(rate).toBeNaN();
		});
	});
});