const router = require('koa-router')();
const userDB = require('../db/userDB');

router.post('/signin', (ctx) => {
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
		ret.id =  result.id;
	} else {
		ctx.status = 400;
	}

	ctx.body = ret;
});

module.exports = router;