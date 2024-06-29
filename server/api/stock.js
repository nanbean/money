const fetch = require('node-fetch');
const router = require('koa-router')();

const config = require('../config');

router.post('/realtime', async (ctx) => {
	const { stocks } = ctx.request.body;
    const apiUrl = `${config.reaitimeApiRul}?query=SERVICE_RECENT_ITEM:${stocks.join(',')}`;
	result = await fetch(apiUrl);
    data = await result.json();
    if (data.resultCode === 'success' && data.result.areas[0]) {
        ctx.body = { return: true, result: data.result.areas[0].datas.map(i => ({symbol: i.cd, name: i.nm, price: i.nv})) };
    } else {
        ctx.body = { return: false };
    }
});

module.exports = router;