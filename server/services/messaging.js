const path = require('path');
const fs = require('fs').promises;
// firebase-admin 13 부터 기본 export 의 네임스페이스가 서브패스로 갈렸다.
// credential 과 messaging() 은 이제 각 서브패스에서 가져온다.
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

const serviceAccount = require('../firebase-credential.json');

const filePath = path.resolve(__dirname, 'messaging.json');

initializeApp({
	credential: cert(serviceAccount)
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

// 휴대폰이 잠시 오프라인일 때 FCM·APNs 가 보관하는 시간.
const PUSH_TTL_SECONDS = 24 * 60 * 60;

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
		},
		// 우선순위를 지정하지 않은 데이터 메시지는 APNs 에서 '보통' 우선순위가 되어,
		// 휴대폰이 저전력·집중 모드이거나 네트워크가 바뀌는 중이면 늦거나 버려진다
		// (2026-10-28 15:30 국장 마감 알림이 서버·FCM 은 정상인데 도착하지 않았다).
		// 하루 몇 건뿐인 알림이라 높음으로 보내고, 잠시 오프라인이어도 하루 동안은
		// 다시 연결되면 받도록 TTL 을 준다.
		webpush: {
			headers: {
				Urgency: 'high',
				TTL: String(PUSH_TTL_SECONDS)
			}
		}
	};

	const INVALID_TOKEN_CODES = [
		'messaging/registration-token-not-registered',
		'messaging/invalid-registration-token',
		'messaging/app-instance-not-registered'
	];

	const invalidTokens = [];
	const settledPromises = await Promise.allSettled(tokens.map(token => {
		const tokenMessage = { ...message, token };
		return getMessaging().send(tokenMessage)
			.catch(error => {
				if (INVALID_TOKEN_CODES.includes(error.code)) {
					invalidTokens.push(token);
				} else {
					console.error('Error sending notification to token:', token, error);
				}
				return Promise.reject(error);
			});
	}));

	// 알림마다 FCM 응답을 남긴다. 도착하지 않았을 때 '서버가 안 보냈다 / FCM 이 거부했다 /
	// 보냈는데 휴대폰에서 사라졌다'를 가르려면 메시지 ID 가 필요하다. 토큰은 끝 6자리만.
	console.log('[push] sent', JSON.stringify({
		title,
		results: settledPromises.map((r, i) => ({
			token: `…${String(tokens[i]).slice(-6)}`,
			status: r.status,
			id: r.status === 'fulfilled' ? String(r.value).split('/').pop() : undefined,
			error: r.status === 'rejected' ? (r.reason && (r.reason.code || r.reason.message)) : undefined
		}))
	}));

	if (invalidTokens.length > 0) {
		const messaging = await readMessagingFile();
		messaging.tokens = messaging.tokens.filter(t => !invalidTokens.includes(t));
		await writeMessagingFile(messaging);
		console.log(`Removed ${invalidTokens.length} invalid FCM token(s).`);
	}

	return settledPromises;
};
