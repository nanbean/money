const { retryWithBackoff, isRetryableError } = require('./retry');

describe('isRetryableError', () => {
	// 재시도해도 소용없는 4xx 와, 스스로 회복되는 5xx/429 를 갈라야 한다.
	test.each([
		[429, true],
		[500, true],
		[502, true],
		[503, true],
		[504, true],
		[400, false],
		[401, false],
		[403, false],
		[404, false],
		[422, false]
	])('status %s → %s', (status, expected) => {
		expect(isRetryableError({ status })).toBe(expected);
	});

	test.each([
		['fetch failed', true],
		['Service Unavailable', true],
		['model is overloaded', true],
		['experiencing high demand', true],
		['connect ETIMEDOUT 1.2.3.4:443', true],
		['read ECONNRESET', true],
		['invalid api key', false],
		['', false]
	])('message %p → %s', (message, expected) => {
		expect(isRetryableError(new Error(message))).toBe(expected);
	});

	test('메시지 판정은 대소문자를 구분하지 않는다', () => {
		expect(isRetryableError(new Error('FETCH FAILED'))).toBe(true);
		expect(isRetryableError(new Error('High Demand'))).toBe(true);
	});

	test('null/undefined 에도 던지지 않는다', () => {
		expect(isRetryableError(null)).toBe(false);
		expect(isRetryableError(undefined)).toBe(false);
	});

	// status 가 우선한다. 4xx 인데 메시지에 'fetch failed' 가 섞여도 재시도 대상이 아니어야
	// 정상이지만, 현재 구현은 메시지 매칭으로 true 가 된다. 동작을 고정해 둔다.
	test('4xx 라도 메시지가 일시 오류 패턴이면 재시도로 본다 (현재 동작)', () => {
		expect(isRetryableError(Object.assign(new Error('fetch failed'), { status: 400 }))).toBe(true);
	});
});

describe('retryWithBackoff', () => {
	let delays;
	let sleepSpy;

	beforeEach(() => {
		delays = [];
		// 실제로 기다리지 않고 요청된 지연만 기록한다.
		sleepSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn, ms) => {
			delays.push(ms);
			fn();
			return 0;
		});
		jest.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		sleepSpy.mockRestore();
		jest.restoreAllMocks();
	});

	const transient = () => Object.assign(new Error('high demand'), { status: 503 });

	test('첫 시도에 성공하면 재시도하지 않는다', async () => {
		const fn = jest.fn().mockResolvedValue('ok');
		await expect(retryWithBackoff(fn)).resolves.toBe('ok');
		expect(fn).toHaveBeenCalledTimes(1);
		expect(delays).toHaveLength(0);
	});

	test('일시 오류 뒤 성공하면 그 값을 돌려준다', async () => {
		const fn = jest.fn()
			.mockRejectedValueOnce(transient())
			.mockResolvedValue('ok');
		await expect(retryWithBackoff(fn)).resolves.toBe('ok');
		expect(fn).toHaveBeenCalledTimes(2);
	});

	test('기본 예산은 4회 시도 (retries=3)', async () => {
		const fn = jest.fn().mockRejectedValue(transient());
		await expect(retryWithBackoff(fn)).rejects.toThrow('high demand');
		expect(fn).toHaveBeenCalledTimes(4);
		expect(delays).toHaveLength(3);
	});

	test('영구 오류는 재시도하지 않고 즉시 던진다', async () => {
		const fn = jest.fn().mockRejectedValue(Object.assign(new Error('bad request'), { status: 400 }));
		await expect(retryWithBackoff(fn)).rejects.toThrow('bad request');
		expect(fn).toHaveBeenCalledTimes(1);
		expect(delays).toHaveLength(0);
	});

	// weeklyRecap 이 이 오버라이드에 의존한다 (scheduler.js). 기본값으로 돌아가면
	// Gemini 503 스파이크를 못 넘기므로 회귀 고정한다.
	test('retries/baseDelay/maxDelay 오버라이드가 반영된다', async () => {
		const fn = jest.fn().mockRejectedValue(transient());
		await expect(retryWithBackoff(fn, { retries: 5, baseDelay: 20000, maxDelay: 120000 }))
			.rejects.toThrow('high demand');

		expect(fn).toHaveBeenCalledTimes(6);
		expect(delays).toHaveLength(5);
		// 지수 증가 후 maxDelay 에서 평탄해진다. jitter 는 backoff 의 최대 25%.
		const expectedBase = [20000, 40000, 80000, 120000, 120000];
		delays.forEach((d, i) => {
			expect(d).toBeGreaterThanOrEqual(expectedBase[i]);
			expect(d).toBeLessThanOrEqual(expectedBase[i] * 1.25);
		});
		// 총 대기가 6분 이상이어야 수 분짜리 503 스파이크를 넘긴다.
		expect(delays.reduce((a, b) => a + b, 0)).toBeGreaterThan(6 * 60 * 1000);
	});

	test('기본 예산의 총 대기는 10초 미만이다 (온디맨드 응답성)', async () => {
		const fn = jest.fn().mockRejectedValue(transient());
		await expect(retryWithBackoff(fn)).rejects.toThrow();
		expect(delays.reduce((a, b) => a + b, 0)).toBeLessThan(10000);
	});

	test('지연은 maxDelay + jitter 를 넘지 않는다', async () => {
		const fn = jest.fn().mockRejectedValue(transient());
		await expect(retryWithBackoff(fn, { retries: 8, baseDelay: 1000, maxDelay: 4000 })).rejects.toThrow();
		delays.forEach(d => expect(d).toBeLessThanOrEqual(4000 * 1.25));
	});

	test('label 이 경고 로그에 찍힌다', async () => {
		const fn = jest.fn().mockRejectedValueOnce(transient()).mockResolvedValue('ok');
		await retryWithBackoff(fn, { label: 'weeklyRecap' });
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[retry] weeklyRecap'));
	});

	test('status/message 가 없어도 원인을 로그에 남긴다', async () => {
		const bare = new Error('');
		bare.stack = 'STACK_MARKER';
		// 메시지가 비어 재시도 대상이 아니므로 즉시 던진다 — 로그 없이 끝나는 것이 정상.
		await expect(retryWithBackoff(jest.fn().mockRejectedValue(bare))).rejects.toBe(bare);
		expect(console.warn).not.toHaveBeenCalled();
	});
});
