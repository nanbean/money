const moment = require('moment-timezone');

// node-persist 는 토큰 캐시용. 항상 미스로 두고 토큰은 fetch 목으로 발급한다.
jest.mock('node-persist', () => ({
	create: () => ({
		init: jest.fn(),
		getItem: jest.fn(),
		setItem: jest.fn(),
		removeItem: jest.fn()
	})
}));

const {
	getTossPreviousClose,
	getTossKrPreviousClose,
	getTossPrices,
	getTossExchangeRate,
	mapWithRateLimit,
	isNetworkError
} = require('./tossConnector');

// 토스는 미국 일봉을 '세션 날짜 KST 13:00' 으로 스탬프한다.
// 예: 08-25 세션 → 2026-08-25T13:00:00+09:00 (= ET 08-25 00:00, LA 08-24 21:00)
const candle = (sessionDate, closePrice) => ({
	timestamp: `${sessionDate}T13:00:00.000+09:00`,
	closePrice
});

const jsonResponse = (body) => ({
	ok: true,
	status: 200,
	headers: { get: () => null },
	json: async () => body
});

describe('getTossPreviousClose', () => {
	let candles;

	beforeEach(() => {
		process.env.TOSS_CLIENT_ID = 'test-id';
		process.env.TOSS_CLIENT_SECRET = 'test-secret';
		candles = [];

		global.fetch = jest.fn(async (url) => {
			if (String(url).includes('/oauth2/token')) {
				return jsonResponse({ access_token: 'test-token', expires_in: 3600 });
			}
			if (String(url).includes('/api/v1/candles')) {
				return jsonResponse({ result: { candles } });
			}
			throw new Error(`unexpected url: ${url}`);
		});
	});

	afterEach(() => {
		jest.useRealTimers();
		delete global.fetch;
	});

	// Jest 27 은 useFakeTimers({ now }) 객체 형태를 무시한다. setSystemTime 을 써야
	// 실제로 시각이 고정된다.
	const atEt = (isoEt) => {
		jest.useFakeTimers();
		jest.setSystemTime(moment.tz(isoEt, 'America/New_York').valueOf());
	};

	// 현재 세션은 가장 최신 봉이고, 그 직전 봉의 종가가 기준이 된다.
	test('진행 중인 세션 봉을 기준으로 쓰지 않는다 (장 종료 후)', async () => {
		atEt('2026-08-25 19:26'); // 08-25 정규장 종료 후
		candles = [
			candle('2026-08-25', 350.12),
			candle('2026-08-24', 348.95),
			candle('2026-08-21', 362.86)
		];

		// 08-25 세션의 기준은 08-24 종가다. 350.12(진행 중 세션의 종가)면 버그.
		await expect(getTossPreviousClose('TSLA')).resolves.toEqual({
			close: 348.95,
			sessionDate: '2026-08-25'
		});
	});

	test('장중에도 진행 중인 세션 봉을 제외한다', async () => {
		atEt('2026-08-25 11:00');
		candles = [
			candle('2026-08-25', 349.5), // 미완성 당일 봉
			candle('2026-08-24', 348.95)
		];

		await expect(getTossPreviousClose('TSLA')).resolves.toEqual({
			close: 348.95,
			sessionDate: '2026-08-25'
		});
	});

	// 토스는 야간 세션(20:00 ET~)을 다음 거래일로 집계한다. 실측: ET 08-27 21:28 에
	// lastPrice(354.55)가 08-28 봉과 일치했다. 달력 날짜(08-27)로 걸러내던 때는
	// 08-26 종가를 집어 08-27 정규장 전체가 등락률에 섞였다.
	test('야간 세션에는 직전 거래일 종가가 기준이 된다', async () => {
		atEt('2026-08-27 21:28');
		candles = [
			candle('2026-08-26', 345.82),
			candle('2026-08-27', 354.81), // 08-27 정규장 종가
			candle('2026-08-28', 354.55)  // 진행 중인 야간 세션
		];

		await expect(getTossPreviousClose('TSLA')).resolves.toEqual({
			close: 354.81,
			sessionDate: '2026-08-28'
		});
	});

	// 세션을 봉에서 읽으므로 벽시계와 무관하다 — 시간대 경계 버그가 생길 여지가 없다.
	test('같은 봉이면 호출 시각이 달라도 같은 결과다', async () => {
		candles = [
			candle('2026-08-26', 345.82),
			candle('2026-08-27', 354.81),
			candle('2026-08-28', 354.55)
		];
		const expected = { close: 354.81, sessionDate: '2026-08-28' };

		for (const at of ['2026-08-27 21:28', '2026-08-28 02:00', '2026-08-28 10:00', '2026-08-26 23:59']) {
			atEt(at);
			await expect(getTossPreviousClose('TSLA')).resolves.toEqual(expected);
		}
	});

	test('봉이 하나뿐이면 null (직전 세션을 정할 수 없다)', async () => {
		atEt('2026-08-25 19:26');
		candles = [candle('2026-08-25', 350.12)];

		await expect(getTossPreviousClose('TSLA')).resolves.toBeNull();
	});

	test('봉이 없으면 null', async () => {
		atEt('2026-08-25 19:26');
		candles = [];

		await expect(getTossPreviousClose('TSLA')).resolves.toBeNull();
	});

	test('응답 순서가 뒤섞여도 세션 순으로 고른다', async () => {
		atEt('2026-08-25 19:26');
		candles = [
			candle('2026-08-21', 362.86),
			candle('2026-08-25', 350.12),
			candle('2026-08-24', 348.95)
		];

		await expect(getTossPreviousClose('TSLA')).resolves.toEqual({
			close: 348.95,
			sessionDate: '2026-08-25'
		});
	});

	test('종가가 없는 봉은 무시한다', async () => {
		atEt('2026-08-25 19:26');
		candles = [
			candle('2026-08-23', 340.00),
			candle('2026-08-24', 348.95),
			{ timestamp: '2026-08-25T13:00:00.000+09:00' } // closePrice 누락
		];

		// 유효한 봉만 남으면 08-24 가 진행 중 세션, 08-23 이 기준이 된다.
		await expect(getTossPreviousClose('TSLA')).resolves.toEqual({
			close: 340.00,
			sessionDate: '2026-08-24'
		});
	});
});

// ─────────────────────────────────────────────────────────────────────────────
const okResponse = (body) => ({
	ok: true,
	status: 200,
	headers: { get: () => null },
	json: async () => body
});

const errResponse = (status, body) => ({
	ok: false,
	status,
	headers: { get: () => null },
	json: async () => body
});

// 토큰 발급은 항상 성공시키고, 나머지 경로만 테스트별로 갈아끼운다.
const withToss = (handler) => {
	global.fetch = jest.fn(async (url, options) => {
		if (String(url).includes('/oauth2/token')) {
			return okResponse({ access_token: 'test-token', expires_in: 3600 });
		}
		return handler(String(url), options);
	});
};

const dataUrls = () => global.fetch.mock.calls
	.map(c => String(c[0]))
	.filter(u => !u.includes('/oauth2/token'));

describe('tossConnector 나머지 경로', () => {
	beforeEach(() => {
		process.env.TOSS_CLIENT_ID = 'test-id';
		process.env.TOSS_CLIENT_SECRET = 'test-secret';
		jest.spyOn(console, 'error').mockImplementation(() => {});
		jest.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		delete global.fetch;
	});

	// 토스 일봉은 KRX+NXT 통합이라 종가에 애프터마켓이 섞인다. 그래서 상/하한가의
	// 평균(= KRX 기준가 = 전일 정규장 종가)으로 복원하는 우회로를 쓴다.
	describe('getTossKrPreviousClose', () => {
		test('상한가와 하한가의 평균으로 기준가를 복원한다', async () => {
			// 기준가 70,000 → ±30% = 91,000 / 49,000
			withToss(() => okResponse({ result: { upperLimitPrice: '91000', lowerLimitPrice: '49000' } }));

			await expect(getTossKrPreviousClose('005930')).resolves.toBe(70000);
		});

		test('상/하한가가 없으면 null', async () => {
			withToss(() => okResponse({ result: {} }));
			await expect(getTossKrPreviousClose('005930')).resolves.toBeNull();
		});

		test('symbol 을 URL 인코딩해서 넘긴다', async () => {
			withToss(() => okResponse({ result: { upperLimitPrice: '10', lowerLimitPrice: '4' } }));
			await getTossKrPreviousClose('00593 0');
			expect(dataUrls()[0]).toContain('symbol=00593%200');
		});

		test('일봉 API 를 쓰지 않는다 (NXT 오염 회피)', async () => {
			withToss(() => okResponse({ result: { upperLimitPrice: '91000', lowerLimitPrice: '49000' } }));
			await getTossKrPreviousClose('005930');
			expect(dataUrls().some(u => u.includes('/candles'))).toBe(false);
			expect(dataUrls()[0]).toContain('/price-limits');
		});
	});

	describe('getTossPrices', () => {
		test('빈 입력에는 요청하지 않는다', async () => {
			withToss(() => { throw new Error('should not fetch'); });
			await expect(getTossPrices([])).resolves.toEqual(new Map());
			await expect(getTossPrices(null)).resolves.toEqual(new Map());
			expect(global.fetch).not.toHaveBeenCalled();
		});

		test('symbol 로 키를 잡은 Map 을 돌려준다', async () => {
			withToss(() => okResponse({ result: [
				{ symbol: '005930', lastPrice: 75000 },
				{ symbol: 'TSLA', lastPrice: 350.12 }
			] }));

			const map = await getTossPrices(['005930', 'TSLA']);

			expect(map.get('005930').lastPrice).toBe(75000);
			expect(map.get('TSLA').lastPrice).toBe(350.12);
		});

		test('중복 심볼과 falsy 값을 걸러 한 번만 요청한다', async () => {
			withToss(() => okResponse({ result: [] }));
			await getTossPrices(['005930', '005930', null, undefined, '']);
			expect(dataUrls()).toHaveLength(1);
			expect(dataUrls()[0]).toContain(encodeURIComponent('005930'));
		});

		// docs 상 symbols 최대 200개. 초과분은 분할해야 한다.
		test('200개를 넘으면 배치로 쪼갠다', async () => {
			withToss(() => okResponse({ result: [] }));
			const symbols = Array.from({ length: 250 }, (_, i) => `S${i}`);

			await getTossPrices(symbols);

			expect(dataUrls()).toHaveLength(2);
		});

		test('일부 배치가 실패해도 나머지는 살린다', async () => {
			const symbols = Array.from({ length: 250 }, (_, i) => `S${i}`);
			let call = 0;
			withToss(() => {
				call++;
				// 4xx 는 재시도 없이 즉시 실패한다 (테스트가 백오프로 늦어지지 않게).
				if (call === 1) return errResponse(400, { error: { code: 'bad', message: 'nope' } });
				return okResponse({ result: [{ symbol: 'S200', lastPrice: 1 }] });
			});

			const map = await getTossPrices(symbols);

			expect(map.get('S200').lastPrice).toBe(1);
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining('getTossPrices batch'),
				expect.anything()
			);
		});

		test('symbol 없는 항목은 Map 에 넣지 않는다', async () => {
			withToss(() => okResponse({ result: [{ lastPrice: 1 }, null, { symbol: 'OK', lastPrice: 2 }] }));
			const map = await getTossPrices(['OK']);
			expect(map.size).toBe(1);
			expect(map.get('OK').lastPrice).toBe(2);
		});
	});

	describe('getTossExchangeRate', () => {
		// KIS 의 frst_bltn_exrt(매매기준율)와 맞추기 위해 midRate 를 우선한다.
		test('midRate 를 rate 보다 우선한다', async () => {
			withToss(() => okResponse({ result: { midRate: '1380.5', rate: '1390.0' } }));
			await expect(getTossExchangeRate()).resolves.toBe(1380.5);
		});

		test('midRate 가 없으면 rate 로 폴백한다', async () => {
			withToss(() => okResponse({ result: { rate: '1390.0' } }));
			await expect(getTossExchangeRate()).resolves.toBe(1390);
		});

		test('둘 다 없으면 null', async () => {
			withToss(() => okResponse({ result: {} }));
			await expect(getTossExchangeRate()).resolves.toBeNull();
		});
	});

	// client 당 유효 토큰이 1개뿐이라 다른 프로세스가 재발급하면 기존 토큰이 죽는다.
	// 그때 401 을 받으면 한 번 갱신해 재시도해야 조용히 실패하지 않는다.
	describe('401 재시도', () => {
		test('401 이면 토큰을 갱신해 한 번 재시도한다', async () => {
			let dataCall = 0;
			withToss(() => {
				dataCall++;
				if (dataCall === 1) return errResponse(401, { error: { code: 'unauthorized' } });
				return okResponse({ result: { midRate: '1380' } });
			});

			await expect(getTossExchangeRate()).resolves.toBe(1380);
			expect(dataCall).toBe(2);
			// 토큰 발급이 두 번 일어난다 (최초 + 강제 갱신)
			const tokenCalls = global.fetch.mock.calls.filter(c => String(c[0]).includes('/oauth2/token'));
			expect(tokenCalls).toHaveLength(2);
		});

		test('재시도도 401 이면 에러를 던진다', async () => {
			withToss(() => errResponse(401, { error: { code: 'unauthorized', message: 'nope' } }));
			await expect(getTossExchangeRate()).rejects.toThrow(/401/);
		});
	});

	describe('자격증명 검증', () => {
		test('TOSS_CLIENT_ID 가 없으면 명확히 던진다', async () => {
			delete process.env.TOSS_CLIENT_ID;
			withToss(() => okResponse({}));
			await expect(getTossExchangeRate()).rejects.toThrow('TOSS_CLIENT_ID / TOSS_CLIENT_SECRET not set in env');
		});
	});

	describe('mapWithRateLimit', () => {
		test('순차 실행하며 성공/실패를 항목별로 담는다', async () => {
			const fn = jest.fn(async (item) => {
				if (item === 'bad') throw new Error('boom');
				return item.toUpperCase();
			});

			const out = await mapWithRateLimit(['a', 'bad', 'b'], fn, { intervalMs: 0 });

			expect(out).toEqual([
				{ item: 'a', value: 'A', error: null },
				{ item: 'bad', value: null, error: expect.any(Error) },
				{ item: 'b', value: 'B', error: null }
			]);
		});

		test('한 항목이 실패해도 나머지를 계속 처리한다', async () => {
			const fn = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('ok');
			const out = await mapWithRateLimit([1, 2, 3], fn, { intervalMs: 0 });
			expect(fn).toHaveBeenCalledTimes(3);
			expect(out.filter(r => r.error)).toHaveLength(1);
		});
	});

	describe('isNetworkError', () => {
		test.each([
			['ECONNRESET', true],
			['ECONNREFUSED', true],
			['ETIMEDOUT', true],
			['ENOTFOUND', true],
			['EPERM', false]
		])('%s → %s', (code, expected) => {
			expect(isNetworkError({ code })).toBe(expected);
		});
	});
});
