const path = require('path');
const fs = require('fs');
const util = require('util');
const admin = require("firebase-admin");

const serviceAccount = require('./firebase-credential.json');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const filePath = path.resolve(__dirname, 'messaging.json');

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
});

const readMessagingFile = async () => {
	return await readFile(filePath);
}

const writeMessagingFile = async (data) => {
	return await writeFile(filePath, JSON.stringify(data, null, 2));
}

exports.addToken = async (newToken) => {
	const messaging = await readMessagingFile().then(data => {
		return JSON.parse(data);
	});

	if (!messaging.tokens.some(i => i === newToken)) {
		messaging.tokens.push(newToken);
		await writeMessagingFile(messaging).then(() => {
			return true;
		});
		return true;
	} else {
		return false;
	}
}

exports.removeToken = async (removeToken) => {
	const messaging = await readMessagingFile().then(data => {
		return JSON.parse(data);
	});
	const tokenIdx = messaging.tokens.findIndex(i => i === removeToken);

	if (tokenIdx >= 0) {
		messaging.tokens.splice(tokenIdx, 1);
		await writeMessagingFile(messaging).then(() => {
			return true;
		});
		return true;
	} else {
		return true;
	}
}

exports.sendNotification = async (title, body, type = 'icon', target = '') => {
	const tokens = await readMessagingFile().then(data => {
		const result = JSON.parse(data);
		return result.tokens;
	});

	const message = {
		data: {
			icon: `https://money.nanbean.net/${type}.png`,
			badge: 'https://money.nanbean.net/badge.png',
			title: title,
			body: body,
			click_action: `./${target}`
		}
	};

	const sendPromises = tokens.map(async (token) => {
		const tokenMessage = { ...message, token };
		return await admin.messaging().send(tokenMessage);
	});

	const results = await Promise.all(sendPromises);
	return results;
}
