const Router = require('koa-router');

const messaging = require('../services/messaging');
const notification = require('../services/notification');
const couchdb = require('../db/couchdb');
const aiService = require('../services/aiService');
const snaptradeService = require('../services/snaptradeService');
const requireAuth = require('../middleware/requireAuth');

const api = new Router();

const auth = require('./auth');
const stock = require('./stock');

api.use(async (ctx, next) => {
	if (ctx.path.startsWith('/auth') || ctx.path.startsWith('/api/auth')) return next();
	return requireAuth(ctx, next);
});

api.get('/updateInvestmentPrice', async (ctx) => {
	await couchdb.updateInvestmentPrice();

	ctx.body = { return: true };
});

api.post('/addTransactionWithNotification', async (ctx) => {
	const body = ctx.request.body;
	const result = await notification.addTransaction(body);

	ctx.body = { return: result };
});

api.post('/testNotification', async (ctx) => {
	const body = ctx.request.body;
	await messaging.sendNotification(body.title, body.body, 'graph');

	ctx.body = { return: true };
});

api.get('/notifications', async (ctx) => {
	const size = ctx.request.query.size || 20;
	const history = await notification.getHistory(size);

	ctx.body = history;
});

api.get('/getLifetimeFlow', async (ctx) => {
	const list = await couchdb.getLifetimeFlowList();
	ctx.body = {
		count: list.length,
		list: list
	};
});

api.post('/registerMessageToken', async (ctx) => {
	const body = ctx.request.body;

	if (body && body.messagingToken) {
		const result = await messaging.addToken(body.messagingToken);

		ctx.body = { return: result };
	} else {
		ctx.body = { return: false };
	}
});

api.post('/unRegisterMessageToken', async (ctx) => {
	const body = ctx.request.body;

	if (body && body.messagingToken) {
		const result = await messaging.removeToken(body.messagingToken);

		ctx.body = { return: result };
	} else {
		ctx.body = { return: false };
	}
});

api.post('/portfolioComment', async (ctx) => {
	try {
		const comment = await aiService.getPortfolioComment(ctx.request.body);
		ctx.body = { comment };
	} catch (err) {
		console.error('portfolioComment error:', err);
		ctx.status = 500;
		ctx.body = { error: err.message };
	}
});

api.get('/robinhoodAccounts', async (ctx) => {
	try {
		const data = await snaptradeService.getAllAccountsData();
		ctx.body = data;
	} catch (err) {
		console.error('robinhoodAccounts error:', err);
		ctx.status = 500;
		ctx.body = { error: err.message };
	}
});

api.use('/auth', auth.routes());
api.use('/stock', stock.routes());

module.exports = api;
