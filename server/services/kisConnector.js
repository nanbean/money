const localdb  = require('node-persist');
const moment = require('moment-timezone');

const KIS_URL = 'https://openapi.koreainvestment.com:9443';

const storage = localdb.create({ ttl: true, logging: true });
storage.init();

const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
	for (let i = 0; i < retries; i++) {
		try {
			const response = await fetch(url, options);
			if (!response.ok && (response.status >= 500 || response.status === 429)) {
				throw new Error(`HTTP Error ${response.status}`);
			}
			return response;
		} catch (err) {
			if (i === retries - 1) throw err;
			await new Promise(res => setTimeout(res, delay));
		}
	}
};

const isUsDayMarketTime = () => {
	const now = moment().tz('America/New_York');
	const day = now.day();
	const hour = now.hour();

	// The day market is closed from Friday at 4:00 AM until Sunday at 8:00 PM
	if (day === 5 && hour >= 4) return false;
	if (day === 6) return false;
	if (day === 0 && hour < 20) return false;

	// The day market trading hours for the U.S. stock market, 20:00 ~ 03:00
	const isDayMarketTime = (hour >= 20) || (hour < 3);

	return isDayMarketTime;
};

async function getKisToken (forceRefresh = false) {
	if (!forceRefresh) {
		const accessToken = await storage.getItem('access_token');
		const accessTokenTokenExpired = await storage.getItem('access_token_token_expired');

		if (accessToken && accessTokenTokenExpired) {
			const expireTime = moment(accessTokenTokenExpired, 'YYYY-MM-DD HH:mm:ss').tz('Asia/Seoul');
			const now = moment().tz('Asia/Seoul');
			if (now < expireTime) {
				return accessToken;
			}
		}
	}

	// Clear stale cache before requesting a new token
	await storage.removeItem('access_token');
	await storage.removeItem('access_token_token_expired');

	const headers = {
		'content-type': 'application/json; charset=utf-8'
	};
	const body = {
		'grant_type': 'client_credentials',
		appkey: process.env.KIS_APP_KEY,
		appsecret: process.env.KIS_APP_SECRET
	};

	const response = await fetchWithRetry(`${KIS_URL}/oauth2/tokenP`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});
	const result = await response.json();
	result.access_token && await storage.setItem('access_token', result.access_token);
	result.access_token_token_expired && await storage.setItem('access_token_token_expired', result.access_token_token_expired);
	return result.access_token;
}

async function getKisQuoteKorea (accessToken, googleSymbol) {
	const doRequest = async (token) => {
		const headers = {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Bearer ${token}`,
			appkey: process.env.KIS_APP_KEY,
			appsecret: process.env.KIS_APP_SECRET,
			'tr_id': 'FHKST01010100'
		};
		const response = await fetchWithRetry(`${KIS_URL}/uapi/domestic-stock/v1/quotations/inquire-price?fid_cond_mrkt_div_code=J&fid_input_iscd=${googleSymbol.split(':')[1]}`, {
			method: 'GET',
			headers
		});
		const result = await response.json();
		result.googleSymbol = googleSymbol;
		return result;
	};

	try {
		return await doRequest(accessToken);
	} catch (err) {
		if (err.message && err.message.includes('500')) {
			console.warn(`getKisQuoteKorea 500 for ${googleSymbol}, refreshing token and retrying...`);
			const freshToken = await getKisToken(true);
			return await doRequest(freshToken);
		}
		throw err;
	}
}

async function getKisQuoteUS (accessToken, googleSymbol) {
	let EXCD = '';
	if (googleSymbol.startsWith('NYSE:')) {
		EXCD = isUsDayMarketTime() ? 'BAY' : 'NYS';
	} else if (googleSymbol.startsWith('NASDAQ:')) {
		EXCD = isUsDayMarketTime() ? 'BAQ' : 'NAS';
	}

	const doRequest = async (token) => {
		const headers = {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Bearer ${token}`,
			appkey: process.env.KIS_APP_KEY,
			appsecret: process.env.KIS_APP_SECRET,
			'tr_id': 'HHDFS00000300'
		};
		const response = await fetchWithRetry(`${KIS_URL}/uapi/overseas-price/v1/quotations/price?AUTH=""&EXCD=${EXCD}&SYMB=${googleSymbol.split(':')[1]}`, {
			method: 'GET',
			headers
		});
		const result = await response.json();
		result.googleSymbol = googleSymbol;
		return result;
	};

	try {
		return await doRequest(accessToken);
	} catch (err) {
		if (err.message && err.message.includes('500')) {
			console.warn(`getKisQuoteUS 500 for ${googleSymbol}, refreshing token and retrying...`);
			const freshToken = await getKisToken(true);
			return await doRequest(freshToken);
		}
		throw err;
	}
}

async function getKisExchangeRate (accessToken) {
	const doRequest = async (token) => {
		const headers = {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Bearer ${token}`,
			appkey: process.env.KIS_APP_KEY,
			appsecret: process.env.KIS_APP_SECRET,
			'tr_id': 'CTRP6504R'
		};
		const response = await fetchWithRetry(`${KIS_URL}/uapi/overseas-stock/v1/trading/inquire-present-balance?CANO=${process.env.KIS_ACCOUNT_NO}&ACNT_PRDT_CD=01&NATN_CD=000&WCRC_FRCR_DVSN_CD=01&TR_MKET_CD=00&INQR_DVSN_CD=00`, {
			method: 'GET',
			headers
		});
		const result = await response.json();
		const rateString = result?.output2?.[0]?.frst_bltn_exrt;
		return parseFloat(rateString);
	};

	try {
		return await doRequest(accessToken);
	} catch (err) {
		if (err.message && err.message.includes('500')) {
			console.warn('getKisExchangeRate 500, refreshing token and retrying...');
			const freshToken = await getKisToken(true);
			return await doRequest(freshToken);
		}
		throw err;
	}
}

exports.getKisToken = getKisToken;
exports.getKisQuoteKorea = getKisQuoteKorea;
exports.getKisQuoteUS = getKisQuoteUS;
exports.getKisExchangeRate = getKisExchangeRate;