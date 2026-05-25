const dotenv = require('dotenv');
const path = require('path');

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

// Log crashes loudly so the next investigation isn't blind. Node 22 terminates the
// process on unhandled rejection by default, which is why we silently restart.
process.on('unhandledRejection', (reason, promise) => {
	console.error('[fatal] unhandledRejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
	console.error('[fatal] uncaughtException:', err);
});

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const fs = require('fs');
const app = new Koa();
const router = new Router();

const api = require('./api');

const PORT = process.env.PORT || 3004;
const indexHtml = fs.readFileSync(path.resolve(__dirname, '../build/index.html'), { encoding: 'utf8' });

// service-worker.js는 항상 최신 버전을 받도록 캐시 금지
app.use(async (ctx, next) => {
	await next();
	if (ctx.path === '/service-worker.js') {
		ctx.set('Cache-Control', 'no-cache, no-store, must-revalidate');
	}
});

app.use(serve(path.resolve(__dirname, '../build/')));

app.use(bodyParser());

router.use('/api', api.routes());
app.use(router.routes()).use(router.allowedMethods());

app.use(ctx => {
	ctx.body = indexHtml;
});

app.listen(PORT);
