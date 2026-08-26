const { singleFlight } = require('./singleFlight');

// 스케줄러와 API 가 동시에 같은 CouchDB 문서를 갱신하는 것을 막는 유일한 장치라
// dedup 경로와 초기화 경로를 모두 고정해 둔다.
describe('singleFlight', () => {
	beforeEach(() => {
		jest.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	const deferred = () => {
		let resolve, reject;
		const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
		return { promise, resolve, reject };
	};

	test('진행 중이면 같은 Promise 를 돌려주고 fn 을 다시 부르지 않는다', async () => {
		const d = deferred();
		const fn = jest.fn(() => d.promise);
		const wrapped = singleFlight('job', fn);

		const first = wrapped();
		const second = wrapped();

		// dedup 판정은 동기라 두 번째 호출이 곧바로 같은 Promise 를 받는다.
		expect(second).toBe(first);

		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(1);

		d.resolve('done');
		await expect(first).resolves.toBe('done');
		await expect(second).resolves.toBe('done');
	});

	// fn 은 Promise.resolve().then 안에서 실행되므로 호출이 마이크로태스크 한 틱
	// 뒤로 밀린다. 동기 실행을 가정한 코드가 들어오면 깨지므로 고정해 둔다.
	test('fn 호출은 마이크로태스크 뒤로 밀린다 (동기 실행 아님)', async () => {
		const fn = jest.fn().mockResolvedValue('ok');
		const wrapped = singleFlight('job', fn);

		wrapped();
		expect(fn).not.toHaveBeenCalled();

		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	test('dedup 시 label 을 로그에 남긴다', async () => {
		const d = deferred();
		const wrapped = singleFlight('arrangeKRInvestmemt', () => d.promise);

		wrapped();
		wrapped();

		expect(console.log).toHaveBeenCalledWith(
			expect.stringContaining('[singleFlight] arrangeKRInvestmemt dedup')
		);
		d.resolve();
		await wrapped();
	});

	test('완료 후에는 다시 실행된다', async () => {
		const fn = jest.fn().mockResolvedValue('ok');
		const wrapped = singleFlight('job', fn);

		await wrapped();
		await wrapped();

		expect(fn).toHaveBeenCalledTimes(2);
	});

	// finally 로 초기화되지 않으면 한 번 실패한 뒤 영구히 같은 rejected promise 만
	// 돌려주게 된다. 스케줄러가 죽는 시나리오라 반드시 고정한다.
	test('실패해도 in-flight 가 초기화되어 다음 호출이 새로 실행된다', async () => {
		const fn = jest.fn()
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValue('recovered');
		const wrapped = singleFlight('job', fn);

		await expect(wrapped()).rejects.toThrow('boom');
		await expect(wrapped()).resolves.toBe('recovered');
		expect(fn).toHaveBeenCalledTimes(2);
	});

	test('동시 호출이 실패하면 모두 같은 오류를 받는다', async () => {
		const d = deferred();
		const wrapped = singleFlight('job', () => d.promise);

		const first = wrapped();
		const second = wrapped();
		const err = new Error('boom');
		d.reject(err);

		await expect(first).rejects.toBe(err);
		await expect(second).rejects.toBe(err);
	});

	test('인자를 그대로 전달한다', async () => {
		const fn = jest.fn().mockResolvedValue('ok');
		const wrapped = singleFlight('job', fn);

		await wrapped({ retryOptions: { retries: 5 } }, 'extra');

		expect(fn).toHaveBeenCalledWith({ retryOptions: { retries: 5 } }, 'extra');
	});

	// fn 이 동기적으로 던져도 Promise.resolve().then 안에서 실행되므로
	// 호출자는 rejected promise 를 받아야 한다 (동기 throw 로 새지 않는다).
	test('fn 이 동기적으로 던져도 rejected promise 가 된다', async () => {
		const wrapped = singleFlight('job', () => { throw new Error('sync boom'); });

		await expect(wrapped()).rejects.toThrow('sync boom');
		await expect(wrapped()).rejects.toThrow('sync boom');
	});

	test('래퍼끼리 상태를 공유하지 않는다', async () => {
		const d = deferred();
		const a = singleFlight('a', () => d.promise);
		const b = jest.fn().mockResolvedValue('b-ok');
		const wrappedB = singleFlight('b', b);

		a();
		await expect(wrappedB()).resolves.toBe('b-ok');
		d.resolve();
	});
});
