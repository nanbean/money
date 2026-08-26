const fetch = require('node-fetch');

jest.mock('node-fetch');
jest.mock('../config', () => ({ couchDBUrl: 'couch.example.com' }), { virtual: true });
jest.mock('../db/userDB', () => ({ insertUser: jest.fn() }));

const userDB = require('../db/userDB');
const auth = require('./auth');

const routeLayer = (method, path) =>
	auth.stack.find(l => l.methods.includes(method) && l.path === path);

const makeCtx = (body = {}) => ({
	request: { body },
	status: undefined,
	body: undefined,
	cookies: { get: jest.fn(), set: jest.fn() }
});

const runRoute = async (method, path, ctx) => {
	const layer = routeLayer(method, path);
	if (!layer) throw new Error(`route not found: ${method} ${path}`);
	for (const mw of layer.stack) await mw(ctx, async () => {});
	return ctx;
};

const couchResponse = (body, setCookie = null) => ({
	json: jest.fn().mockResolvedValue(body),
	headers: { get: jest.fn(() => setCookie) }
});

describe('api/auth', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('signin/signout/signup 이 등록되어 있다', () => {
		expect(routeLayer('POST', '/signin')).toBeDefined();
		expect(routeLayer('POST', '/signout')).toBeDefined();
		expect(routeLayer('POST', '/signup')).toBeDefined();
	});

	describe('POST /signin', () => {
		test('성공하면 CouchDB 세션 쿠키를 httpOnly 로 심는다', async () => {
			fetch.mockResolvedValue(couchResponse(
				{ ok: true, name: 'nanbean' },
				'AuthSession=abc123; Version=1; Path=/; HttpOnly'
			));

			const ctx = await runRoute('POST', '/signin', makeCtx({ username: 'nanbean', password: 'pw' }));

			expect(fetch).toHaveBeenCalledWith('https://couch.example.com/_session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'nanbean', password: 'pw' })
			});
			expect(ctx.cookies.set).toHaveBeenCalledWith('AuthSession', 'abc123', {
				httpOnly: true,
				secure: false,
				maxAge: 30 * 24 * 60 * 60 * 1000,
				overwrite: true
			});
			expect(ctx.body).toEqual({ return: true });
		});

		// 비밀번호를 응답이나 로그로 흘리지 않아야 한다.
		test('실패하면 401 이고 쿠키를 심지 않는다', async () => {
			fetch.mockResolvedValue(couchResponse({ error: 'unauthorized' }));

			const ctx = await runRoute('POST', '/signin', makeCtx({ username: 'nanbean', password: 'wrong' }));

			expect(ctx.status).toBe(401);
			expect(ctx.body).toEqual({ return: false });
			expect(ctx.cookies.set).not.toHaveBeenCalled();
		});

		test('ok 이지만 name 이 없으면 401', async () => {
			fetch.mockResolvedValue(couchResponse({ ok: true }));

			const ctx = await runRoute('POST', '/signin', makeCtx({ username: 'x', password: 'y' }));

			expect(ctx.status).toBe(401);
			expect(ctx.cookies.set).not.toHaveBeenCalled();
		});

		test('CouchDB 접속이 실패하면 500 이고 상세를 노출하지 않는다', async () => {
			fetch.mockRejectedValue(new Error('ECONNREFUSED couch.example.com'));

			const ctx = await runRoute('POST', '/signin', makeCtx({ username: 'x', password: 'y' }));

			expect(ctx.status).toBe(500);
			expect(ctx.body).toEqual({ return: false });
			expect(JSON.stringify(ctx.body)).not.toContain('ECONNREFUSED');
		});

		test('set-cookie 에 AuthSession 이 없으면 쿠키 없이 성공 처리한다', async () => {
			fetch.mockResolvedValue(couchResponse({ ok: true, name: 'nanbean' }, 'Other=1; Path=/'));

			const ctx = await runRoute('POST', '/signin', makeCtx({ username: 'x', password: 'y' }));

			expect(ctx.cookies.set).not.toHaveBeenCalled();
			expect(ctx.body).toEqual({ return: true });
		});

		test('set-cookie 헤더가 아예 없어도 던지지 않는다', async () => {
			fetch.mockResolvedValue(couchResponse({ ok: true, name: 'nanbean' }, null));

			const ctx = await runRoute('POST', '/signin', makeCtx({ username: 'x', password: 'y' }));

			expect(ctx.body).toEqual({ return: true });
		});
	});

	describe('POST /signout', () => {
		test('쿠키를 즉시 만료시킨다', async () => {
			const ctx = await runRoute('POST', '/signout', makeCtx());

			expect(ctx.cookies.set).toHaveBeenCalledWith('AuthSession', '', { maxAge: 0, overwrite: true });
			expect(ctx.body).toEqual({ return: true });
		});
	});

	describe('POST /signup', () => {
		test('성공하면 201 과 id 를 준다', async () => {
			userDB.insertUser.mockResolvedValue({ ok: true, id: 'org.couchdb.user:newbie' });

			const ctx = await runRoute('POST', '/signup', makeCtx({ name: 'newbie', password: 'pw' }));

			expect(userDB.insertUser).toHaveBeenCalledWith(
				{ name: 'newbie', password: 'pw', roles: [], type: 'user' },
				'org.couchdb.user:newbie'
			);
			expect(ctx.status).toBe(201);
			expect(ctx.body).toEqual({ id: 'org.couchdb.user:newbie' });
		});

		test('중복 등록이면 400 과 메시지를 준다', async () => {
			userDB.insertUser.mockRejectedValue(new Error('Document update conflict'));

			const ctx = await runRoute('POST', '/signup', makeCtx({ name: 'existing', password: 'pw' }));

			expect(ctx.status).toBe(400);
			expect(ctx.body).toEqual({ message: 'Document update conflict' });
		});

		test('ok 가 아니면 400', async () => {
			userDB.insertUser.mockResolvedValue({ ok: false });

			const ctx = await runRoute('POST', '/signup', makeCtx({ name: 'x', password: 'y' }));

			expect(ctx.status).toBe(400);
		});

		// roles 를 요청 body 로 받지 않는다. 받으면 권한 상승 경로가 된다.
		test('요청 body 의 roles 는 무시하고 항상 빈 배열로 만든다', async () => {
			userDB.insertUser.mockResolvedValue({ ok: true, id: 'id' });

			await runRoute('POST', '/signup', makeCtx({ name: 'x', password: 'y', roles: ['_admin'] }));

			expect(userDB.insertUser.mock.calls[0][0].roles).toEqual([]);
		});
	});
});
