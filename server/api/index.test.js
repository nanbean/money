// api/index.js 는 import 만으로 CouchDB 연결과 PouchDB 동기화를 띄우므로
// 무거운 의존성을 전부 경계에서 끊는다. 그러면 라우터 자체만 검사할 수 있다.
jest.mock('../db/couchdb', () => ({
	updateInvestmentPrice: jest.fn(),
	getLifetimeFlowList: jest.fn()
}));
jest.mock('../services/messaging', () => ({ sendNotification: jest.fn() }));
jest.mock('../services/notification', () => ({
	addTransaction: jest.fn(),
	getHistory: jest.fn(),
	registerMessageToken: jest.fn(),
	unRegisterMessageToken: jest.fn()
}));
jest.mock('../services/aiService', () => ({
	getPortfolioComment: jest.fn(),
	getWeeklyRecap: jest.fn()
}));
jest.mock('../services/snaptradeService', () => ({ getAllAccountsData: jest.fn() }));
jest.mock('../services/usStockListService', () => ({ updateUSStockList: jest.fn() }));
jest.mock('../services/krStockListService', () => ({ updateKRStockList: jest.fn() }));
jest.mock('../services/reportService', () => ({ updateLifeTimePlanner: jest.fn() }));
jest.mock('../services/benchmarkService', () => ({
	getSp500: jest.fn(),
	backfillSp500: jest.fn(),
	updateSp500: jest.fn()
}));
jest.mock('../services/thesisService', () => ({
	listTheses: jest.fn(),
	getThesis: jest.fn(),
	saveThesis: jest.fn(),
	deleteThesis: jest.fn()
}));
jest.mock('../middleware/requireAuth', () => jest.fn(async (ctx, next) => next()));
jest.mock('./auth', () => ({ routes: () => async (ctx, next) => next() }));
jest.mock('./stock', () => ({ routes: () => async (ctx, next) => next() }));

const requireAuth = require('../middleware/requireAuth');
const couchdb = require('../db/couchdb');
const notification = require('../services/notification');
const aiService = require('../services/aiService');
const api = require('./index');

// koa-router 의 Layer 를 직접 꺼내 실행한다. HTTP 서버를 띄우지 않아도
// 핸들러와 미들웨어의 동작을 그대로 확인할 수 있다.
const routeLayer = (method, path) =>
	api.stack.find(l => l.methods.includes(method) && l.path === path);

// api.use(fn) 으로 등록된 미들웨어는 methods 가 비어 있다. 첫 번째가 인증 미들웨어이고
// 뒤쪽은 api.use('/auth', ...) 같은 서브라우터 마운트다.
const authMiddleware = () => {
	const layer = api.stack.find(l => l.methods.length === 0);
	return layer.stack[layer.stack.length - 1];
};

const makeCtx = ({ path = '/api/x', query = {}, body = {} } = {}) => ({
	path,
	request: { query, body },
	status: undefined,
	body: undefined
});

const runRoute = async (method, path, ctx) => {
	const layer = routeLayer(method, path);
	if (!layer) throw new Error(`route not found: ${method} ${path}`);
	for (const mw of layer.stack) {
		await mw(ctx, async () => {});
	}
	return ctx;
};

describe('api 라우터', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		requireAuth.mockImplementation(async (ctx, next) => next());
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	// 인증 우회 목록이 넓어지면 그만큼 무인증 표면이 늘어난다.
	describe('인증 미들웨어 배선', () => {
		const runAuthMiddleware = async (path) => {
			const next = jest.fn().mockResolvedValue(undefined);
			const ctx = makeCtx({ path });
			await authMiddleware()(ctx, next);
			return { next, ctx };
		};

		test.each([
			['/auth/signin'],
			['/api/auth/signin'],
			['/auth/signout'],
			['/api/auth/whatever']
		])('%s 는 requireAuth 를 건너뛴다', async (path) => {
			const { next } = await runAuthMiddleware(path);

			expect(requireAuth).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalled();
		});

		test.each([
			['/api/getLifetimeFlow'],
			['/api/notifications'],
			['/api/weeklyRecap'],
			['/api/theses']
		])('%s 는 requireAuth 를 통과해야 한다', async (path) => {
			await runAuthMiddleware(path);
			expect(requireAuth).toHaveBeenCalled();
		});

		// 우회 판정이 startsWith 라서 '/auth' · '/api/auth' 로 시작하는 모든 경로가
		// 무인증이 된다. 지금은 그런 라우트가 없어 404 로 끝나지만, 나중에
		// '/authorize' 같은 이름을 붙이면 인증 없이 열린다.
		test.each([
			['/authenticate'],
			['/api/authorize'],
			['/authXYZ']
		])('%s 도 우회된다 (startsWith 프리픽스 매칭의 부작용)', async (path) => {
			await runAuthMiddleware(path);
			expect(requireAuth).not.toHaveBeenCalled();
		});

		test('requireAuth 가 401 로 끊으면 next 가 불리지 않는다', async () => {
			requireAuth.mockImplementation(async (ctx) => { ctx.status = 401; });
			const { next, ctx } = await runAuthMiddleware('/api/notifications');

			expect(ctx.status).toBe(401);
			expect(next).not.toHaveBeenCalled();
		});
	});

	describe('라우트 등록', () => {
		test.each([
			['GET', '/updateInvestmentPrice'],
			['GET', '/updateLifeTimePlanner'],
			['GET', '/notifications'],
			['GET', '/getLifetimeFlow'],
			['GET', '/weeklyRecap'],
			['POST', '/addTransactionWithNotification'],
			['POST', '/testNotification'],
			['POST', '/portfolioComment'],
			['GET', '/theses'],
			['GET', '/theses/:id'],
			['POST', '/theses'],
			['DELETE', '/theses/:id']
		])('%s %s 가 등록되어 있다', (method, path) => {
			expect(routeLayer(method, path)).toBeDefined();
		});

		// requireAuth 의 x-api-key 우회 목록과 짝이 맞아야 한다.
		test('x-api-key 우회 대상 경로가 실제로 존재한다', () => {
			expect(routeLayer('POST', '/addTransactionWithNotification')).toBeDefined();
			expect(routeLayer('POST', '/testNotification')).toBeDefined();
		});
	});

	describe('핸들러 동작', () => {
		test('GET /updateInvestmentPrice 는 갱신을 호출하고 return:true 를 준다', async () => {
			const ctx = await runRoute('GET', '/updateInvestmentPrice', makeCtx());

			expect(couchdb.updateInvestmentPrice).toHaveBeenCalledTimes(1);
			expect(ctx.body).toEqual({ return: true });
		});

		test('GET /getLifetimeFlow 는 count 와 list 를 함께 준다', async () => {
			couchdb.getLifetimeFlowList.mockResolvedValue([{ year: 2026 }, { year: 2027 }]);

			const ctx = await runRoute('GET', '/getLifetimeFlow', makeCtx());

			expect(ctx.body).toEqual({ count: 2, list: [{ year: 2026 }, { year: 2027 }] });
		});

		test('GET /notifications 는 size 기본값 20 을 쓴다', async () => {
			notification.getHistory.mockResolvedValue([]);

			await runRoute('GET', '/notifications', makeCtx());

			expect(notification.getHistory).toHaveBeenCalledWith(20);
		});

		test('GET /notifications 는 size 쿼리를 전달한다', async () => {
			notification.getHistory.mockResolvedValue([]);

			await runRoute('GET', '/notifications', makeCtx({ query: { size: '5' } }));

			expect(notification.getHistory).toHaveBeenCalledWith('5');
		});

		test('POST /addTransactionWithNotification 은 body 를 그대로 넘긴다', async () => {
			notification.addTransaction.mockResolvedValue('added');
			const body = { payee: '스타벅스', amount: -5000 };

			const ctx = await runRoute('POST', '/addTransactionWithNotification', makeCtx({ body }));

			expect(notification.addTransaction).toHaveBeenCalledWith(body);
			expect(ctx.body).toEqual({ return: 'added' });
		});

		test('GET /weeklyRecap 은 결과를 그대로 준다', async () => {
			aiService.getWeeklyRecap.mockResolvedValue({ summary: '요약', comment: '본문' });

			const ctx = await runRoute('GET', '/weeklyRecap', makeCtx());

			expect(aiService.getWeeklyRecap).toHaveBeenCalledWith({ dry: false });
			expect(ctx.body).toEqual({ summary: '요약', comment: '본문' });
		});

		test('GET /weeklyRecap?dry=true 는 프롬프트를 감싸서 준다', async () => {
			aiService.getWeeklyRecap.mockResolvedValue('PROMPT');

			const ctx = await runRoute('GET', '/weeklyRecap', makeCtx({ query: { dry: 'true' } }));

			expect(aiService.getWeeklyRecap).toHaveBeenCalledWith({ dry: true });
			expect(ctx.body).toEqual({ prompt: 'PROMPT' });
		});

		test('dry 는 문자열 \'true\' 만 인정한다', async () => {
			aiService.getWeeklyRecap.mockResolvedValue({});

			await runRoute('GET', '/weeklyRecap', makeCtx({ query: { dry: '1' } }));

			expect(aiService.getWeeklyRecap).toHaveBeenCalledWith({ dry: false });
		});
	});

	// 스택 트레이스를 그대로 흘리지 않고 500 + message 로 정리해야 한다.
	describe('에러 처리', () => {
		test.each([
			['GET', '/weeklyRecap', () => aiService.getWeeklyRecap.mockRejectedValue(new Error('gemini down'))],
			['POST', '/portfolioComment', () => aiService.getPortfolioComment.mockRejectedValue(new Error('gemini down'))]
		])('%s %s 실패 시 500 과 error 메시지를 준다', async (method, path, arrange) => {
			arrange();

			const ctx = await runRoute(method, path, makeCtx());

			expect(ctx.status).toBe(500);
			expect(ctx.body).toEqual({ error: 'gemini down' });
			expect(console.error).toHaveBeenCalled();
		});

		// try/catch 가 없는 라우트는 예외가 그대로 올라간다. Koa 기본 에러 처리로
		// 500 이 나가긴 하지만 응답 형태가 위와 다르다는 점을 기록해 둔다.
		test('try/catch 가 없는 라우트는 예외를 그대로 전파한다 (현재 동작)', async () => {
			couchdb.getLifetimeFlowList.mockRejectedValue(new Error('couch down'));

			await expect(runRoute('GET', '/getLifetimeFlow', makeCtx())).rejects.toThrow('couch down');
		});
	});
});
