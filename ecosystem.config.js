module.exports = {
	apps: [
		{
			name: 'money',
			script: './server/index.js',
			interpreter: '/home/ubuntu/.nvm/versions/node/v22.16.0/bin/node',
			cwd: '/home/ubuntu/money',
			cron_restart: '0 4 * * *',
			watch: false,
			// V8 default old space is ~64MB on small heaps. Heap was at 92% (44/48 MiB)
			// in prod and that's the suspected cause of the 207 silent restarts. Lift the
			// ceiling and let PM2 recycle the process before the OS OOM-kills it.
			node_args: '--max-old-space-size=512',
			max_memory_restart: '600M',
			env: {
				NODE_ENV: 'production'
			}
		}
	]
};
