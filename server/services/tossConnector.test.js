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

const { getTossPreviousClose } = require('./tossConnector');

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

	// 이 버그가 미국 등락률을 전부 ≈0% 로 만들었다. 당일 봉이 LA 기준으로 전날로
	// 밀려 필터를 통과하면서 '전일 종가'가 당일 종가가 됐다.
	test('당일 봉을 전일 종가로 쓰지 않는다 (장 종료 후)', async () => {
		atEt('2026-08-25 19:26'); // 08-25 정규장 종료 후
		candles = [
			candle('2026-08-25', 350.12),
			candle('2026-08-24', 348.95),
			candle('2026-08-21', 362.86)
		];

		// 08-25 세션의 '전일'은 08-24 종가여야 한다. 350.12(당일 종가)면 버그.
		await expect(getTossPreviousClose('TSLA')).resolves.toBe(348.95);
	});

	test('장중에도 당일 봉을 제외한다', async () => {
		atEt('2026-08-25 11:00');
		candles = [
			candle('2026-08-25', 349.5), // 미완성 당일 봉
			candle('2026-08-24', 348.95)
		];

		await expect(getTossPreviousClose('TSLA')).resolves.toBe(348.95);
	});

	// 한국장 마감 크론(15:30 KST)은 ET 로 다음날 새벽이다. 그때는 직전 세션이
	// '전일'이 되고 lastPrice 는 애프터마켓 값이라 장외 등락률이 나온다 — 의도된 동작.
	test('다음 세션 개장 전에는 직전 세션 종가가 전일 종가가 된다', async () => {
		atEt('2026-08-26 02:30'); // = 15:30 KST 08-26
		candles = [
			candle('2026-08-25', 350.12),
			candle('2026-08-24', 348.95)
		];

		await expect(getTossPreviousClose('TSLA')).resolves.toBe(350.12);
	});

	test('과거 봉이 없으면 null', async () => {
		atEt('2026-08-25 19:26');
		candles = [candle('2026-08-25', 350.12)];

		await expect(getTossPreviousClose('TSLA')).resolves.toBeNull();
	});

	test('응답 순서가 뒤섞여도 가장 최근 과거 봉을 고른다', async () => {
		atEt('2026-08-25 19:26');
		candles = [
			candle('2026-08-21', 362.86),
			candle('2026-08-25', 350.12),
			candle('2026-08-24', 348.95)
		];

		await expect(getTossPreviousClose('TSLA')).resolves.toBe(348.95);
	});
});
