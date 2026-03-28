const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
	// CouchDB proxy — dev에서 same-site 쿠키 문제 해결
	app.use(
		'/couchdb',
		createProxyMiddleware({
			target: 'https://couchdb-wsl.nanbean.net',
			changeOrigin: true,
			pathRewrite: { '^/couchdb': '' },
			secure: false
		})
	);

	// Koa 서버 proxy (package.json "proxy" 필드 대체)
	app.use(
		'/api',
		createProxyMiddleware({
			target: 'http://localhost:3004',
			changeOrigin: true
		})
	);
};
