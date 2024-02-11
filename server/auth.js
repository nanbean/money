const config = require('./config');
const nano = require('nano')(`https://${config.couchDBAdminId}:${config.couchDBAdminPassword}@${config.couchDBUrl}`);
const router = require('koa-router')();

const _users = nano.use('_users');

router.get('/', (ctx, next) => {
	let body = { return: '/auth' };

	ctx.body = body;
});

router.post('/signin', (ctx, next) => {
	const body = ctx.request.body;
	const ret = {};
	let body = { return: '/auth/signin' };

	ctx.body = body;
	ctx.body = { return: false };
});

router.post('/signup', async (ctx, next) => {
	const {name, password} = ctx.request.body;
	const user = {
		name,
		password,
		roles: [],
		type: 'user'
	};
	const ret = {};

	console.log(name, password)

	const result = await _users.insert(user, `org.couchdb.user:${name}`);

	ctx.body = { return: result };
});

module.exports = router;