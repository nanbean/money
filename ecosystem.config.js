module.exports = {
	apps: [
		{
			name: 'money',
			script: './server/index.js',
			interpreter: '/home/ubuntu/.nvm/versions/node/v22.16.0/bin/node',
			cwd: '/home/ubuntu/money',
			cron_restart: '0 4 * * *',
			watch: false,
			// 로그 각 줄에 타임스탬프를 붙인다. 이게 없어서 에러가 언제 난 건지
			// 파일 mtime으로 추측해야 했다(Toss 전환 전/후 구분 불가).
			// 로테이션은 pm2 모듈 대신 /etc/logrotate.d/pm2-money(system logrotate)가
			// 담당한다 — 이 서버는 메모리가 빡빡해서 상주 모듈을 추가하지 않았다.
			time: true,
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
