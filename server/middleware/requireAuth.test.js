const fetch = require('node-fetch');
const requireAuth = require('./requireAuth');

jest.mock('node-fetch');
jest.mock('../config', () => ({
	apiKey: 'secret-api-key',
	couchDBUrl: 'couch.example.com'
}), { virtual: true });

// 모든 API 요청이 통과하는 인증 경계다. 통과 조건이 느슨해지면 전 구간이 열린다.
describe('requireAuth', () => {
	let next;

	const makeCtx = ({ path = '/api/getAccountList', headers = {}, cookie } = {}) => ({
		path,
		headers,
		status: undefined,
		body: undefined,
		cookies: {
			get: jest.fn(() => cookie),
			set: jest.fn()
		}
	});

	const sessionResponse = (body, setCookie = null) => ({
		json: jest.fn().mockResolvedValue(body),
		headers: { get: jest.fn(() => setCookie) }
	});

	beforeEach(() => {
		jest.clearAllMocks();
		next = jest.fn().mockResolvedValue(undefined);
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('세션 쿠키 인증', () => {
		test('유효한 세션이면 통과시킨다', async () => {
			const ctx = makeCtx({ cookie: 'valid-session' });
			fetch.mockResolvedValue(sessionResponse({ userCtx: { name: 'nanbean' } }));

			await requireAuth(ctx, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(ctx.status).toBeUndefined();
			expect(fetch).toHaveBeenCalledWith(
				'https://couch.example.com/_session',
				{ headers: { Cookie: 'AuthSession=valid-session' } }
			);
		});

		test('쿠키가 없으면 401 이고 next 를 부르지 않는다', async () => {
			const ctx = makeCtx({ cookie: undefined });

			await requireAuth(ctx, next);

			expect(ctx.status).toBe(401);
			expect(ctx.body).toEqual({ error: 'Unauthorized' });
			expect(next).not.toHaveBeenCalled();
			expect(fetch).not.toHaveBeenCalled();
		});

		test('userCtx 가 없으면 401', async () => {
			const ctx = makeCtx({ cookie: 'bad-session' });
			fetch.mockResolvedValue(sessionResponse({}));

			await requireAuth(ctx, next);

			expect(ctx.status).toBe(401);
			expect(next).not.toHaveBeenCalled();
		});

		// 익명 세션은 userCtx.name 이 null 로 온다. 이걸 통과시키면 인증이 무의미해진다.
		test('userCtx.name 이 null 인 익명 세션은 401', async () => {
			const ctx = makeCtx({ cookie: 'anon-session' });
			fetch.mockResolvedValue(sessionResponse({ userCtx: { name: null, roles: [] } }));

			await requireAuth(ctx, next);

			expect(ctx.status).toBe(401);
			expect(next).not.toHaveBeenCalled();
		});

		test('CouchDB 조회가 실패하면 401 로 닫는다 (열지 않는다)', async () => {
			const ctx = makeCtx({ cookie: 'valid-session' });
			fetch.mockRejectedValue(new Error('ECONNREFUSED'));

			await requireAuth(ctx, next);

			expect(ctx.status).toBe(401);
			expect(ctx.body).toEqual({ error: 'Unauthorized' });
			expect(next).not.toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith('requireAuth error:', expect.any(Error));
		});
	});

	describe('세션 쿠키 갱신', () => {
		test('CouchDB 가 새 세션을 주면 쿠키를 갱신한다', async () => {
			const ctx = makeCtx({ cookie: 'old-session' });
			fetch.mockResolvedValue(sessionResponse(
				{ userCtx: { name: 'nanbean' } },
				'AuthSession=new-session; Version=1; Path=/; HttpOnly'
			));

			await requireAuth(ctx, next);

			expect(ctx.cookies.set).toHaveBeenCalledWith('AuthSession', 'new-session', {
				httpOnly: true,
				secure: false,
				maxAge: 30 * 24 * 60 * 60 * 1000,
				overwrite: true
			});
			expect(next).toHaveBeenCalledTimes(1);
		});

		test('세션이 그대로면 쿠키를 다시 쓰지 않는다', async () => {
			const ctx = makeCtx({ cookie: 'same-session' });
			fetch.mockResolvedValue(sessionResponse(
				{ userCtx: { name: 'nanbean' } },
				'AuthSession=same-session; Path=/'
			));

			await requireAuth(ctx, next);

			expect(ctx.cookies.set).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledTimes(1);
		});

		test('set-cookie 가 없어도 통과한다', async () => {
			const ctx = makeCtx({ cookie: 'valid-session' });
			fetch.mockResolvedValue(sessionResponse({ userCtx: { name: 'nanbean' } }, null));

			await requireAuth(ctx, next);

			expect(ctx.cookies.set).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledTimes(1);
		});

		test('set-cookie 에 AuthSession 이 없으면 갱신하지 않는다', async () => {
			const ctx = makeCtx({ cookie: 'valid-session' });
			fetch.mockResolvedValue(sessionResponse(
				{ userCtx: { name: 'nanbean' } },
				'Other=x; Path=/'
			));

			await requireAuth(ctx, next);

			expect(ctx.cookies.set).not.toHaveBeenCalled();
		});
	});

	describe('x-api-key 우회 경로', () => {
		const ALLOWED = ['/api/addTransactionWithNotification', '/api/testNotification'];

		test.each(ALLOWED)('%s 는 올바른 키로 세션 없이 통과한다', async (path) => {
			const ctx = makeCtx({ path, headers: { 'x-api-key': 'secret-api-key' } });

			await requireAuth(ctx, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(ctx.cookies.get).not.toHaveBeenCalled();
			expect(fetch).not.toHaveBeenCalled();
		});

		// 허용 경로가 늘어나면 세션 없이 접근 가능한 표면이 늘어난다. 목록을 고정한다.
		test('허용 경로는 이 두 개뿐이다', async () => {
			const ctx = makeCtx({ path: '/api/getAccountList', headers: { 'x-api-key': 'secret-api-key' } });

			await requireAuth(ctx, next);

			// 허용 목록에 없으므로 API 키가 맞아도 세션 검사로 내려가고, 쿠키가 없어 401
			expect(ctx.status).toBe(401);
			expect(next).not.toHaveBeenCalled();
		});

		test('키가 틀리면 우회하지 못하고 세션 검사로 내려간다', async () => {
			const ctx = makeCtx({
				path: '/api/testNotification',
				headers: { 'x-api-key': 'wrong-key' }
			});

			await requireAuth(ctx, next);

			expect(ctx.status).toBe(401);
			expect(next).not.toHaveBeenCalled();
		});

		test('키가 없으면 우회하지 못한다', async () => {
			const ctx = makeCtx({ path: '/api/testNotification' });

			await requireAuth(ctx, next);

			expect(ctx.status).toBe(401);
			expect(next).not.toHaveBeenCalled();
		});

		test('허용 경로여도 유효한 세션이 있으면 통과한다', async () => {
			const ctx = makeCtx({ path: '/api/testNotification', cookie: 'valid-session' });
			fetch.mockResolvedValue(sessionResponse({ userCtx: { name: 'nanbean' } }));

			await requireAuth(ctx, next);

			expect(next).toHaveBeenCalledTimes(1);
		});
	});
});
