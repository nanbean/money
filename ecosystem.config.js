module.exports = {
	apps: [
		{
			name: 'money',
			script: './server/index.js',
			interpreter: '/home/ubuntu/.nvm/versions/node/v22.16.0/bin/node',
			cwd: '/home/ubuntu/money',
			cron_restart: '0 4 * * *',
			watch: false,
			env: {
				NODE_ENV: 'production'
			}
		}
	]
};
