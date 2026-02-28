const fetch = require('node-fetch');
const config = require('../config');

const requireAuth = async (ctx, next) => {
	// API 키 인증 (외부 모바일 앱 등)
	const apiKey = ctx.headers['x-api-key'];
	if (apiKey && config.apiKey && apiKey === config.apiKey) {
		return await next();
	}

	const authSession = ctx.cookies.get('AuthSession');

	if (!authSession) {
		ctx.status = 401;
		ctx.body = { error: 'Unauthorized' };
		return;
	}

	try {
		const res = await fetch(`https://${config.couchDBUrl}/_session`, {
			headers: { Cookie: `AuthSession=${authSession}` }
		});
		const data = await res.json();

		if (!data.userCtx || !data.userCtx.name) {
			ctx.status = 401;
			ctx.body = { error: 'Unauthorized' };
			return;
		}

		// CouchDB가 세션을 갱신했으면 쿠키도 갱신
		const renewedCookie = res.headers.get('set-cookie');
		const newAuthSession = renewedCookie?.match(/AuthSession=([^;]+)/)?.[1];
		if (newAuthSession && newAuthSession !== authSession) {
			ctx.cookies.set('AuthSession', newAuthSession, {
				httpOnly: true,
				secure: false,
				maxAge: 30 * 24 * 60 * 60 * 1000,
				overwrite: true
			});
		}

		await next();
	} catch (err) {
		console.error('requireAuth error:', err);
		ctx.status = 401;
		ctx.body = { error: 'Unauthorized' };
	}
};

module.exports = requireAuth;
