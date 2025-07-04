const Router = require('koa-router');


const messaging = require('../services/messaging');
const notification = require('../services/notification');
const couchdb = require('../db/couchdb');

const api = new Router();
const auth = require('./auth');
const stock = require('./stock');

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

api.use('/auth', auth.routes());
api.use('/stock', stock.routes());

module.exports = api;
