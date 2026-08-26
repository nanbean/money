const fetch = require('node-fetch');

jest.mock('node-fetch');
jest.mock('../config', () => ({ reaitimeApiRul: 'https://realtime.example.com/q' }), { virtual: true });

const stock = require('./stock');

const routeLayer = (method, path) =>
	stock.stack.find(l => l.methods.includes(method) && l.path === path);

const runRoute = async (method, path, body) => {
	const ctx = { request: { body }, status: undefined, body: undefined };
	const layer = routeLayer(method, path);
	for (const mw of layer.stack) await mw(ctx, async () => {});
	return ctx;
};

const jsonOf = (body) => ({ json: jest.fn().mockResolvedValue(body) });

describe('api/stock', () => {
	beforeEach(() => jest.clearAllMocks());

	test('POST /realtime 이 등록되어 있다', () => {
		expect(routeLayer('POST', '/realtime')).toBeDefined();
	});

	test('심볼을 콤마로 이어 붙여 조회한다', async () => {
		fetch.mockResolvedValue(jsonOf({
			resultCode: 'success',
			result: { areas: [{ datas: [{ cd: '005930', nm: '삼성전자', nv: 75000 }] }] }
		}));

		const ctx = await runRoute('POST', '/realtime', { stocks: ['005930', '000660'] });

		expect(fetch).toHaveBeenCalledWith(
			'https://realtime.example.com/q?query=SERVICE_RECENT_ITEM:005930,000660'
		);
		expect(ctx.body).toEqual({
			return: true,
			result: [{ symbol: '005930', name: '삼성전자', price: 75000 }]
		});
	});

	test('resultCode 가 success 가 아니면 return:false', async () => {
		fetch.mockResolvedValue(jsonOf({ resultCode: 'error' }));

		expect(await runRoute('POST', '/realtime', { stocks: ['005930'] }))
			.toMatchObject({ body: { return: false } });
	});

	test('areas 가 비면 return:false', async () => {
		fetch.mockResolvedValue(jsonOf({ resultCode: 'success', result: { areas: [] } }));

		expect(await runRoute('POST', '/realtime', { stocks: ['005930'] }))
			.toMatchObject({ body: { return: false } });
	});

	test('여러 종목을 모두 매핑한다', async () => {
		fetch.mockResolvedValue(jsonOf({
			resultCode: 'success',
			result: { areas: [{ datas: [
				{ cd: '005930', nm: '삼성전자', nv: 75000 },
				{ cd: '000660', nm: 'SK하이닉스', nv: 135000 }
			] }] }
		}));

		const ctx = await runRoute('POST', '/realtime', { stocks: ['005930', '000660'] });

		expect(ctx.body.result).toHaveLength(2);
		expect(ctx.body.result[1]).toEqual({ symbol: '000660', name: 'SK하이닉스', price: 135000 });
	});
});
