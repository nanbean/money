const localdb  = require('node-persist');
const moment = require('moment-timezone');

const KIS_URL = 'https://openapi.koreainvestment.com:9443';

const storage = localdb.create({ ttl: true, logging: true });
storage.init();

const isUsDayMarketTime = () => {
	const now = moment().tz('America/New_York');
	const day = now.day();
	const hour = now.hour();

	// The day market trading hours for the U.S. stock market, 20:00 ~ 03:00
	const isDayMarketTime = (hour >= 20) || (hour < 3);

	return isDayMarketTime;
}

async function getKisToken () {
	const accessToken = await storage.getItem('access_token');
	const accessTokenTokenExpired = await storage.getItem('access_token_token_expired');

	if (accessToken) {
		if (accessTokenTokenExpired) {
			const expireTime = moment(accessTokenTokenExpired, 'YYYY-MM-DD HH:mm:ss').tz('Asia/Seoul');
			const now = moment().tz('Asia/Seoul');
			if (now < expireTime) {
				return accessToken;
			} else {
			}
		}
		
	}

	const headers = {
		'content-type': 'application/json; charset=utf-8'
	};
	const body = {
		'grant_type': 'client_credentials',
		appkey: process.env.KIS_APP_KEY,
		appsecret: process.env.KIS_APP_SECRET
	};
	
	const response = await fetch(`${KIS_URL}/oauth2/tokenP`, {
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
	return new Promise(async (resolve, reject) => {
		const headers = {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Bearer ${accessToken}`,
			appkey: process.env.KIS_APP_KEY,
			appsecret: process.env.KIS_APP_SECRET,
			'tr_id': 'FHKST01010100'
		};
		const response = await fetch(`${KIS_URL}/uapi/domestic-stock/v1/quotations/inquire-price?fid_cond_mrkt_div_code=J&fid_input_iscd=${googleSymbol.split(':')[1]}`, {
			method: 'GET',
			headers
		});
		const result = await response.json();
		result.googleSymbol = googleSymbol;
		resolve(result);
	});
}

async function getKisQuoteUS (accessToken, googleSymbol) {
	let EXCD = '';
	if (googleSymbol.startsWith('NYSE:')) {
		EXCD = isUsDayMarketTime() ? 'BAY':'NYS';
	} else if (googleSymbol.startsWith('NASDAQ:')) {
		EXCD = isUsDayMarketTime() ? 'BAQ':'NAS';
	}

	return new Promise(async (resolve, reject) => {
		const headers = {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Bearer ${accessToken}`,
			appkey: process.env.KIS_APP_KEY,
			appsecret: process.env.KIS_APP_SECRET,
			'tr_id': 'HHDFS00000300'
		};
		const response = await fetch(`${KIS_URL}/uapi/overseas-price/v1/quotations/price?AUTH=""&EXCD=${EXCD}&SYMB=${googleSymbol.split(':')[1]}`, {
			method: 'GET',
			headers
		});
		const result = await response.json();
		result.googleSymbol = googleSymbol;
		resolve(result);
	});
}

async function getKisExchangeRate (accessToken) {
	return new Promise(async (resolve, reject) => {
		const headers = {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Bearer ${accessToken}`,
			appkey: process.env.KIS_APP_KEY,
			appsecret: process.env.KIS_APP_SECRET,
			'tr_id': 'CTRP6504R'
		};
		const response = await fetch(`${KIS_URL}/uapi/overseas-stock/v1/trading/inquire-present-balance?CANO=${process.env.KIS_ACCOUNT_NO}&ACNT_PRDT_CD=01&NATN_CD=000&WCRC_FRCR_DVSN_CD=01&TR_MKET_CD=00&INQR_DVSN_CD=00`, {
			method: 'GET',
			headers
		});
		const result = await response.json();
		resolve(parseFloat(result.output2[0].frst_bltn_exrt));
	});
}

exports.getKisToken = getKisToken;
exports.getKisQuoteKorea = getKisQuoteKorea;
exports.getKisQuoteUS = getKisQuoteUS;
exports.getKisExchangeRate = getKisExchangeRate;