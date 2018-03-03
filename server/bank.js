const router = require('koa-router')();
const transaction = require('./transaction');

router.get('/api/getBankTransaction', (ctx, next) => {
	let body = {};
	const bank = ctx.request.query.bank;

	body.bank = bank;
	body.data = transaction[bank];
	ctx.body = body;
});

module.exports = router;
