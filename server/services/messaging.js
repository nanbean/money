const path = require('path');
const fs = require('fs').promises;
const admin = require('firebase-admin');

const serviceAccount = require('../firebase-credential.json');

const filePath = path.resolve(__dirname, 'messaging.json');

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
});

const readMessagingFile = async () => {
	try {
		const data = await fs.readFile(filePath);
		return JSON.parse(data);
	} catch (error) {
		if (error.code === 'ENOENT') {
			return { tokens: [] };
		}
		throw error;
	}
};

const writeMessagingFile = async (data) => {
	return await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

exports.addToken = async (newToken) => {
	const messaging = await readMessagingFile();

	if (!messaging.tokens.some(i => i === newToken)) {
		messaging.tokens.push(newToken);
		await writeMessagingFile(messaging);
		return true;
	} else {
		return false;
	}
};

exports.removeToken = async (removeToken) => {
	const messaging = await readMessagingFile();
	const tokenIdx = messaging.tokens.findIndex(i => i === removeToken);

	if (tokenIdx >= 0) {
		messaging.tokens.splice(tokenIdx, 1);
		await writeMessagingFile(messaging);
	}
	return true;
};

exports.sendNotification = async (title, body, type = 'icon', target = '') => {
	const { tokens } = await readMessagingFile();

	if (!tokens || tokens.length === 0) {
		return [];
	}

	const message = {
		data: {
			icon: `https://money.nanbean.net/${type}.png`,
			badge: 'https://money.nanbean.net/badge.png',
			title: title,
			body: body,
			click_action: `./${target}`
		}
	};

	const invalidTokens = [];
	const settledPromises = await Promise.allSettled(tokens.map(token => {
		const tokenMessage = { ...message, token };
		return admin.messaging().send(tokenMessage)
			.catch(error => {
				if (error.code === 'messaging/registration-token-not-registered') {
					invalidTokens.push(token);
				} else {
					console.error('Error sending notification to token:', token, error);
				}
				return Promise.reject(error);
			});
	}));

	if (invalidTokens.length > 0) {
		const messaging = await readMessagingFile();
		messaging.tokens = messaging.tokens.filter(t => !invalidTokens.includes(t));
		await writeMessagingFile(messaging);
	}

	return settledPromises;
};
