const localdb  = require('node-persist');
const moment = require('moment-timezone');

const KIS_URL = 'https://openapi.koreainvestment.com:9443';

const storage = localdb.create({ ttl: true, logging: true });
storage.init();

const isUsRegularTime = () => {
	const now = moment().tz('America/New_York');
	const day = now.day();
	const hour = now.hour();
	const minute = now.minute();

	// The regular trading hours for the U.S. stock market, 9:30 am to 4 pm
	const isWeekday = day >= 1 && day <= 5;
	const isMarketTime = (hour > 9 || (hour === 9 && minute >= 30)) && (hour < 16);

	return isWeekday && isMarketTime;
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

async function getQuoteKorea (accessToken, googleSymbol) {
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

async function getQuoteUS (accessToken, googleSymbol) {
	let EXCD = '';
	if (googleSymbol.startsWith('NYSE:')) {
		EXCD = isUsRegularTime() ? 'NYS':'BAY';
	} else if (googleSymbol.startsWith('NASDAQ:')) {
		EXCD = isUsRegularTime() ? 'NAS':'BAQ';
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

exports.getKisToken = getKisToken;
exports.getQuoteKorea = getQuoteKorea;
exports.getQuoteUS = getQuoteUS;
