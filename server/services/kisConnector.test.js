const { getKisToken, getKisQuoteKorea, getKisQuoteUS, getKisExchangeRate } = require('./kisConnector');
const localdb = require('node-persist');

// Mock node-persist
jest.mock('node-persist', () => ({
	create: jest.fn().mockReturnThis(),
	init: jest.fn(),
	getItem: jest.fn(),
	setItem: jest.fn(),
	removeItem: jest.fn()
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
				access_token_token_expired: '2025-01-01 10:00:00'
			};
			fetch.mockResolvedValueOnce({
				json: () => Promise.resolve(mockApiResponse)
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
				access_token_token_expired: '2024-01-04 00:00:00'
			};
			fetch.mockResolvedValueOnce({
				json: () => Promise.resolve(mockApiResponse)
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
				json: () => Promise.resolve(mockApiResponse)
			});

			// Act
			const result = await getKisQuoteKorea(mockAccessToken, mockGoogleSymbol);

			// Assert
			expect(fetch).toHaveBeenCalledTimes(1);
			const expectedUrl = 'https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price?fid_cond_mrkt_div_code=J&fid_input_iscd=005930';
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
				json: () => Promise.resolve(mockApiResponse)
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
				json: () => Promise.resolve(mockApiResponse)
			});

			// Act
			const rate = await getKisExchangeRate(mockAccessToken);

			// Assert
			expect(rate).toBeNaN();
		});
	});
});
// ─────────────────────────────────────────────────────────────────────────────
// 주문/잔고 경로. tradeContext 의 alias 해석과 주문 body 조립은 순수 로직인데
// 여기서 틀리면 실제 돈이 잘못된 계좌로 나간다.
// ─────────────────────────────────────────────────────────────────────────────
const kis = require('./kisConnector');

describe('kisConnector 주문 경로', () => {
	const ENV_KEYS = [
		'KIS_TRADE_LIVE',
		'KIS_APP_KEY', 'KIS_APP_SECRET', 'KIS_ACCOUNT_CANO', 'KIS_ACCOUNT_PRDT',
		'KIS_PENSION_APP_KEY', 'KIS_PENSION_APP_SECRET', 'KIS_PENSION_CANO', 'KIS_PENSION_PRDT',
		'KIS_VTS_APP_KEY', 'KIS_VTS_APP_SECRET', 'KIS_VTS_ACCOUNT_CANO', 'KIS_VTS_ACCOUNT_PRDT'
	];
	let savedEnv;

	beforeEach(() => {
		// 형제 describe 의 beforeEach 는 적용되지 않으므로 여기서 직접 초기화한다.
		// 빠뜨리면 fetch 호출 이력이 테스트 간에 누적된다.
		jest.clearAllMocks();
		savedEnv = {};
		ENV_KEYS.forEach(k => { savedEnv[k] = process.env[k]; delete process.env[k]; });
		process.env.KIS_APP_KEY = 'main-key';
		process.env.KIS_APP_SECRET = 'main-secret';
		process.env.KIS_ACCOUNT_CANO = '11111111';
		process.env.KIS_ACCOUNT_PRDT = '01';
		process.env.KIS_PENSION_APP_KEY = 'pension-key';
		process.env.KIS_PENSION_APP_SECRET = 'pension-secret';
		process.env.KIS_PENSION_CANO = '44481908';
		process.env.KIS_PENSION_PRDT = '22';
	});

	afterEach(() => {
		ENV_KEYS.forEach(k => {
			if (savedEnv[k] === undefined) delete process.env[k];
			else process.env[k] = savedEnv[k];
		});
	});

	describe('tradeContext', () => {
		test('KIS_TRADE_LIVE 가 1 이 아니면 모의(VTS) 로 간다', () => {
			expect(kis.tradeContext(undefined, 'main').live).toBe(false);
			process.env.KIS_TRADE_LIVE = '0';
			expect(kis.tradeContext(undefined, 'main').live).toBe(false);
			process.env.KIS_TRADE_LIVE = 'true';
			expect(kis.tradeContext(undefined, 'main').live).toBe(false);
		});

		test('KIS_TRADE_LIVE=1 이면 실전으로 간다', () => {
			process.env.KIS_TRADE_LIVE = '1';
			const ctx = kis.tradeContext(undefined, 'main');
			expect(ctx.live).toBe(true);
			expect(ctx.baseUrl).toContain('openapi.koreainvestment.com:9443');
		});

		test('명시적 live 인자가 env 를 덮는다', () => {
			process.env.KIS_TRADE_LIVE = '1';
			expect(kis.tradeContext(false, 'main').live).toBe(false);
			delete process.env.KIS_TRADE_LIVE;
			expect(kis.tradeContext(true, 'main').live).toBe(true);
		});

		test('VTS 는 별도 호스트를 쓴다', () => {
			expect(kis.tradeContext(false, 'main').baseUrl).toContain('openapivts.koreainvestment.com:29443');
		});

		test('main alias 는 KIS_ACCOUNT_* 와 메인 키를 쓴다', () => {
			const ctx = kis.tradeContext(true, 'main');
			expect(ctx).toMatchObject({
				alias: 'main',
				appkey: 'main-key',
				appsecret: 'main-secret',
				cano: '11111111',
				prdt: '01'
			});
		});

		test('alias 미지정이면 main 으로 본다', () => {
			expect(kis.tradeContext(true).alias).toBe('main');
			expect(kis.tradeContext(true).cano).toBe('11111111');
		});

		// 연금계좌는 자체 App Key 가 발급된다. 메인 키를 쓰면 주문이 거부된다.
		test('pension alias 는 전용 계좌와 전용 키를 쓴다', () => {
			const ctx = kis.tradeContext(true, 'pension');
			expect(ctx).toMatchObject({
				alias: 'pension',
				appkey: 'pension-key',
				appsecret: 'pension-secret',
				cano: '44481908',
				prdt: '22'
			});
		});

		test('alias 는 대소문자를 가리지 않는다', () => {
			expect(kis.tradeContext(true, 'PENSION').cano).toBe('44481908');
			expect(kis.tradeContext(true, 'Pension').appkey).toBe('pension-key');
		});

		test('alias 전용 키가 없으면 메인 키로 폴백한다', () => {
			delete process.env.KIS_PENSION_APP_KEY;
			delete process.env.KIS_PENSION_APP_SECRET;
			const ctx = kis.tradeContext(true, 'pension');
			expect(ctx.appkey).toBe('main-key');
			expect(ctx.cano).toBe('44481908'); // 계좌는 여전히 연금
		});

		test('VTS 전용 키가 없으면 실전 키로 폴백한다', () => {
			const ctx = kis.tradeContext(false, 'main');
			expect(ctx.appkey).toBe('main-key');
		});

		test('VTS 전용 키가 있으면 그것을 쓴다', () => {
			process.env.KIS_VTS_APP_KEY = 'vts-key';
			process.env.KIS_VTS_APP_SECRET = 'vts-secret';
			const ctx = kis.tradeContext(false, 'main');
			expect(ctx.appkey).toBe('vts-key');
			expect(ctx.appsecret).toBe('vts-secret');
		});
	});

	describe('placeKisDomesticOrder', () => {
		const okJson = (body) => ({ ok: true, status: 200, json: async () => body });

		const mockOrderFlow = () => {
			fetch.mockImplementation(async (url) => {
				const u = String(url);
				if (u.includes('/oauth2/tokenP')) {
					return okJson({ access_token: 'tok', access_token_token_expired: '2099-01-01 00:00:00' });
				}
				if (u.includes('/uapi/hashkey')) return okJson({ HASH: 'HASHVALUE' });
				if (u.includes('/trading/order-cash')) return okJson({ rt_cd: '0', msg1: 'ok', output: { ODNO: '123' } });
				throw new Error(`unexpected url ${u}`);
			});
		};

		const callsTo = (needle) => fetch.mock.calls.filter(c => String(c[0]).includes(needle));
		const bodyOf = (call) => JSON.parse(call[1].body);
		const headersOf = (call) => call[1].headers;

		beforeEach(() => {
			jest.useRealTimers(); // 토큰 만료 비교에 실제 시각이 필요하다
			localdb.getItem.mockResolvedValue(undefined);
			mockOrderFlow();
		});

		test('지정가 매수 body 를 규격대로 조립한다', async () => {
			await kis.placeKisDomesticOrder({
				live: true, side: 'buy', symbol: '457480', quantity: 27, price: 18400, account: 'pension'
			});

			const body = bodyOf(callsTo('/trading/order-cash')[0]);
			expect(body).toEqual({
				CANO: '44481908',
				ACNT_PRDT_CD: '22',
				PDNO: '457480',
				ORD_DVSN: '00',
				ORD_QTY: '27',
				ORD_UNPR: '18400'
			});
		});

		test.each([
			[true, 'buy', 'TTTC0802U'],
			[true, 'sell', 'TTTC0801U'],
			[false, 'buy', 'VTTC0802U'],
			[false, 'sell', 'VTTC0801U']
		])('live=%s side=%s → tr_id %s', async (live, side, trId) => {
			await kis.placeKisDomesticOrder({ live, side, symbol: '005930', quantity: 1, price: 70000 });
			expect(headersOf(callsTo('/trading/order-cash')[0]).tr_id).toBe(trId);
		});

		test('시장가(01)는 ORD_UNPR 을 0 으로 보낸다', async () => {
			await kis.placeKisDomesticOrder({
				live: true, side: 'buy', symbol: '005930', quantity: 1, price: 70000, ordType: '01'
			});
			const body = bodyOf(callsTo('/trading/order-cash')[0]);
			expect(body.ORD_DVSN).toBe('01');
			expect(body.ORD_UNPR).toBe('0');
		});

		// 이 단언이 있었다면 getKisHashkey 의 alias 누락 버그를 바로 잡았다.
		// 메인 키로 받은 해시를 연금 키 헤더와 함께 보내면 불일치가 된다.
		test('hashkey 를 주문과 같은 alias 의 키로 발급받는다', async () => {
			await kis.placeKisDomesticOrder({
				live: true, side: 'buy', symbol: '457480', quantity: 1, price: 18400, account: 'pension'
			});

			const hashHeaders = headersOf(callsTo('/uapi/hashkey')[0]);
			const orderHeaders = headersOf(callsTo('/trading/order-cash')[0]);

			expect(hashHeaders.appkey).toBe('pension-key');
			expect(hashHeaders.appsecret).toBe('pension-secret');
			expect(orderHeaders.appkey).toBe('pension-key');
			expect(hashHeaders.appkey).toBe(orderHeaders.appkey);
		});

		test('발급받은 hashkey 를 주문 헤더에 넣는다', async () => {
			await kis.placeKisDomesticOrder({ live: true, side: 'buy', symbol: '005930', quantity: 1, price: 70000 });
			expect(headersOf(callsTo('/trading/order-cash')[0]).hashkey).toBe('HASHVALUE');
		});

		test('hashkey 는 주문 body 와 동일한 payload 로 요청한다', async () => {
			await kis.placeKisDomesticOrder({ live: true, side: 'buy', symbol: '005930', quantity: 2, price: 70000 });
			expect(bodyOf(callsTo('/uapi/hashkey')[0])).toEqual(bodyOf(callsTo('/trading/order-cash')[0]));
		});

		test('KIS 가 거부하면 msg_cd 와 msg1 을 담아 던진다', async () => {
			fetch.mockImplementation(async (url) => {
				const u = String(url);
				if (u.includes('/oauth2/tokenP')) return okJson({ access_token: 'tok', access_token_token_expired: '2099-01-01 00:00:00' });
				if (u.includes('/uapi/hashkey')) return okJson({ HASH: 'H' });
				return okJson({ rt_cd: '1', msg_cd: 'APBK0952', msg1: '주문가능금액을 초과 했습니다' });
			});

			await expect(kis.placeKisDomesticOrder({
				live: true, side: 'buy', symbol: '457480', quantity: 27, price: 18475, account: 'pension'
			})).rejects.toThrow('KIS domestic order: APBK0952 주문가능금액을 초과 했습니다');
		});

		describe('입력 검증 — 주문 전에 막는다', () => {
			test.each([
				['side 가 buy/sell 이 아니면', { side: 'hold', symbol: '005930', quantity: 1, price: 1 }, 'side must be "buy" or "sell"'],
				['symbol 이 없으면', { side: 'buy', quantity: 1, price: 1 }, 'symbol required'],
				['quantity 가 0 이면', { side: 'buy', symbol: '005930', quantity: 0, price: 1 }, 'quantity must be > 0'],
				['quantity 가 음수면', { side: 'buy', symbol: '005930', quantity: -1, price: 1 }, 'quantity must be > 0'],
				['지정가인데 price 가 0 이면', { side: 'buy', symbol: '005930', quantity: 1, price: 0 }, 'price must be > 0 for limit order']
			])('%s 던진다', async (_label, args, message) => {
				await expect(kis.placeKisDomesticOrder({ live: true, ...args })).rejects.toThrow(message);
				expect(callsTo('/trading/order-cash')).toHaveLength(0);
			});

			test('계좌(CANO/PRDT)가 env 에 없으면 던진다', async () => {
				delete process.env.KIS_ACCOUNT_CANO;
				delete process.env.KIS_ACCOUNT_PRDT;
				await expect(kis.placeKisDomesticOrder({
					live: true, side: 'buy', symbol: '005930', quantity: 1, price: 70000
				})).rejects.toThrow('KIS LIVE account (CANO/PRDT) not set in env');
				expect(callsTo('/trading/order-cash')).toHaveLength(0);
			});
		});
	});
});
