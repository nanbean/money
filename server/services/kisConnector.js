const localdb  = require('node-persist');
const moment = require('moment-timezone');

const KIS_URL = 'https://openapi.koreainvestment.com:9443';

const storage = localdb.create({ ttl: true, logging: false });
storage.init();

const isNetworkError = (err) => {
	return err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND';
};

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
			await new Promise(res => setTimeout(res, delay * (i + 1)));
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

let _tokenRefreshPromise = null;

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

	// If already refreshing, reuse the existing promise to avoid concurrent refreshes
	if (_tokenRefreshPromise) {
		return await _tokenRefreshPromise;
	}

	_tokenRefreshPromise = (async () => {
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
	})().finally(() => {
		_tokenRefreshPromise = null;
	});

	return await _tokenRefreshPromise;
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
		if ((err.message && err.message.includes('500')) || isNetworkError(err)) {
			console.warn(`getKisQuoteKorea error for ${googleSymbol}, refreshing token and retrying...`);
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
	} else if (googleSymbol.startsWith('NYSEARCA:')) {
		EXCD = isUsDayMarketTime() ? 'BAA' : 'AMS';
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
		if ((err.message && err.message.includes('500')) || isNetworkError(err)) {
			console.warn(`getKisQuoteUS error for ${googleSymbol}, refreshing token and retrying...`);
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
		if ((err.message && err.message.includes('500')) || isNetworkError(err)) {
			console.warn('getKisExchangeRate error, refreshing token and retrying...');
			const freshToken = await getKisToken(true);
			return await doRequest(freshToken);
		}
		throw err;
	}
}

// Get US stock daily prices (GUBN=0): last ~30 days
// Response output2[]: { xymd(YYYYMMDD), open, high, low, clos }
async function getKisDailyPriceUS (accessToken, googleSymbol) {
	let EXCD = '';
	if (googleSymbol.startsWith('NYSE:')) EXCD = 'NYS';
	else if (googleSymbol.startsWith('NASDAQ:')) EXCD = 'NAS';
	else if (googleSymbol.startsWith('NYSEARCA:')) EXCD = 'AMS';
	else return null;

	const symb = googleSymbol.split(':')[1];

	const doRequest = async (token) => {
		const headers = {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Bearer ${token}`,
			appkey: process.env.KIS_APP_KEY,
			appsecret: process.env.KIS_APP_SECRET,
			'tr_id': 'HHDFS76240000'
		};
		const response = await fetchWithRetry(
			`${KIS_URL}/uapi/overseas-price/v1/quotations/dailyprice?AUTH=&EXCD=${EXCD}&SYMB=${symb}&GUBN=0&BYMD=&MODP=0`,
			{ method: 'GET', headers }
		);
		return await response.json();
	};

	try {
		return await doRequest(accessToken);
	} catch (err) {
		if ((err.message && err.message.includes('500')) || isNetworkError(err)) {
			const freshToken = await getKisToken(true);
			return await doRequest(freshToken);
		}
		throw err;
	}
}

// Variant of getKisDailyPriceUS that accepts a BYMD anchor date (YYYY-MM-DD or
// YYYYMMDD) to walk further into the past for backfill. KIS returns the page
// of ~100 trading days ending at BYMD; pass the day before the oldest entry
// of the previous page to paginate.
async function getKisDailyPriceUSWithDate (accessToken, googleSymbol, bymd = '') {
	let EXCD = '';
	if (googleSymbol.startsWith('NYSE:')) EXCD = 'NYS';
	else if (googleSymbol.startsWith('NASDAQ:')) EXCD = 'NAS';
	else if (googleSymbol.startsWith('NYSEARCA:')) EXCD = 'AMS';
	else return null;

	const symb = googleSymbol.split(':')[1];
	const bymdParam = bymd ? String(bymd).replace(/-/g, '') : '';

	const doRequest = async (token) => {
		const headers = {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Bearer ${token}`,
			appkey: process.env.KIS_APP_KEY,
			appsecret: process.env.KIS_APP_SECRET,
			'tr_id': 'HHDFS76240000'
		};
		const response = await fetchWithRetry(
			`${KIS_URL}/uapi/overseas-price/v1/quotations/dailyprice?AUTH=&EXCD=${EXCD}&SYMB=${symb}&GUBN=0&BYMD=${bymdParam}&MODP=0`,
			{ method: 'GET', headers }
		);
		return await response.json();
	};

	try {
		return await doRequest(accessToken);
	} catch (err) {
		if ((err.message && err.message.includes('500')) || isNetworkError(err)) {
			const freshToken = await getKisToken(true);
			return await doRequest(freshToken);
		}
		throw err;
	}
}

// Get US stock weekly candlestick (GUBN=1): open/high/low/close for current week
// Response output2[0] = current week: { xymd, open, high, low, clos }
async function getKisWeeklyPriceUS (accessToken, googleSymbol) {
	let EXCD = '';
	if (googleSymbol.startsWith('NYSE:')) EXCD = 'NYS';
	else if (googleSymbol.startsWith('NASDAQ:')) EXCD = 'NAS';
	else if (googleSymbol.startsWith('NYSEARCA:')) EXCD = 'AMS';
	else return null;

	const symb = googleSymbol.split(':')[1];

	const doRequest = async (token) => {
		const headers = {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Bearer ${token}`,
			appkey: process.env.KIS_APP_KEY,
			appsecret: process.env.KIS_APP_SECRET,
			'tr_id': 'HHDFS76240000'
		};
		const response = await fetchWithRetry(
			`${KIS_URL}/uapi/overseas-price/v1/quotations/dailyprice?AUTH=&EXCD=${EXCD}&SYMB=${symb}&GUBN=1&BYMD=&MODP=0`,
			{ method: 'GET', headers }
		);
		return await response.json();
	};

	try {
		return await doRequest(accessToken);
	} catch (err) {
		if ((err.message && err.message.includes('500')) || isNetworkError(err)) {
			const freshToken = await getKisToken(true);
			return await doRequest(freshToken);
		}
		throw err;
	}
}

// Get KR stock daily prices for the past 7 days
// Response output2 sorted newest-first: { stck_bsop_date, stck_oprc, stck_hgpr, stck_lwpr, stck_clpr }
async function getKisWeeklyPriceKorea (accessToken, googleSymbol) {
	const symbol = googleSymbol.split(':')[1];
	const endDate = moment().tz('Asia/Seoul').format('YYYYMMDD');
	const startDate = moment().tz('Asia/Seoul').subtract(7, 'days').format('YYYYMMDD');

	const doRequest = async (token) => {
		const headers = {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Bearer ${token}`,
			appkey: process.env.KIS_APP_KEY,
			appsecret: process.env.KIS_APP_SECRET,
			'tr_id': 'FHKST03010100'
		};
		const response = await fetchWithRetry(
			`${KIS_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${symbol}&FID_INPUT_DATE_1=${startDate}&FID_INPUT_DATE_2=${endDate}&FID_PERIOD_DIV_CODE=D&FID_ORG_ADJ_PRC=0`,
			{ method: 'GET', headers }
		);
		return await response.json();
	};

	try {
		return await doRequest(accessToken);
	} catch (err) {
		if ((err.message && err.message.includes('500')) || isNetworkError(err)) {
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
exports.getKisDailyPriceUS = getKisDailyPriceUS;
exports.getKisDailyPriceUSWithDate = getKisDailyPriceUSWithDate;
exports.getKisWeeklyPriceUS = getKisWeeklyPriceUS;
exports.getKisWeeklyPriceKorea = getKisWeeklyPriceKorea;