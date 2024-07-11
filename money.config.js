module.exports = {
	apps: [
		{
			name: "money",
			script: "./server",
			node_args: "--env-file=.env.production"
		},
	],
};
