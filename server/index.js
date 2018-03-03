const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const path = require('path');
const fs = require('fs');
const app = new Koa();

const api = require('./api');
const transaction = require('./transaction');

const PORT = process.env.PORT || 3004
const indexHtml = fs.readFileSync(path.resolve(__dirname, '../build/index.html'), { encoding: 'utf8' });

app.use(serve(path.resolve(__dirname, '../build/')));

app.use(bodyParser());

app.use(api.routes());
app.use(api.allowedMethods());

app.use(ctx => {
	ctx.body = indexHtml;
});

app.listen(PORT);
