const router = require('koa-router')();
const fetch = require('node-fetch');
const config = require('../config');
const userDB = require('../db/userDB');

router.post('/signin', async (ctx) => {
	const { username, password } = ctx.request.body;

	try {
		const res = await fetch(`https://${config.couchDBUrl}/_session`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: username, password })
		});
		const data = await res.json();

		if (data.ok && data.name) {
			const setCookieHeader = res.headers.get('set-cookie');
			const authSession = setCookieHeader?.match(/AuthSession=([^;]+)/)?.[1];

			if (authSession) {
				ctx.cookies.set('AuthSession', authSession, {
					httpOnly: true,
					secure: false,
					maxAge: 30 * 24 * 60 * 60 * 1000,
					overwrite: true
				});
			}
			ctx.body = { return: true };
		} else {
			ctx.status = 401;
			ctx.body = { return: false };
		}
	} catch (err) {
		console.error('signin error:', err);
		ctx.status = 500;
		ctx.body = { return: false };
	}
});

router.post('/signout', (ctx) => {
	ctx.cookies.set('AuthSession', '', { maxAge: 0, overwrite: true });
	ctx.body = { return: true };
});

router.post('/signup', async (ctx) => {
	const { name, password } = ctx.request.body;
	const user = {
		name,
		password,
		roles: [],
		type: 'user'
	};
	const ret = {};
	let result;

	try {
		result = await userDB.insertUser(user, `org.couchdb.user:${name}`);
	} catch (err) {
		ret.message = err.message;
	}

	if (result && result.ok) {
		ctx.status = 201;
		ret.id = result.id;
	} else {
		ctx.status = 400;
	}

	ctx.body = ret;
});

module.exports = router;
