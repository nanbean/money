const localdb  = require('node-persist');
const moment = require('moment-timezone');

const KIS_URL = 'https://openapi.koreainvestment.com:9443';
const KIS_LIVE_URL = 'https://openapi.koreainvestment.com:9443';
const KIS_VTS_URL = 'https://openapivts.koreainvestment.com:29443';

// Trading endpoint context: defaults to KIS_TRADE_LIVE env (0 = VTS, 1 = LIVE).
// Pass `live: true|false` to force a single call. Quote endpoints stay on
// KIS_URL (live) regardless — only trading/balance endpoints split.
const isTradeLive = () => String(process.env.KIS_TRADE_LIVE || '').trim() === '1';

// alias = 'main' (default) → KIS_ACCOUNT_CANO/PRDT + KIS_APP_KEY/SECRET.
// Other alias → KIS_<ALIAS>_CANO/PRDT for the account, and
//   KIS_<ALIAS>_APP_KEY/APP_SECRET for credentials when that account
//   was issued its own key (KIS pension/IRP often is). Falls back to the
//   main key/secret when alias-specific creds aren't configured.
const tradeContext = (overrideLive, accountAlias) => {
	const live = overrideLive === undefined ? isTradeLive() : !!overrideLive;
	const alias = String(accountAlias || 'main').toLowerCase();
	const aliasUpper = alias.toUpperCase();
	const aliasAccountKey = alias === 'main' ? 'ACCOUNT' : aliasUpper;

	if (live) {
		return {
			live: true,
			alias,
			baseUrl: KIS_LIVE_URL,
			appkey: (alias !== 'main' && process.env[`KIS_${aliasUpper}_APP_KEY`]) || process.env.KIS_APP_KEY,
			appsecret: (alias !== 'main' && process.env[`KIS_${aliasUpper}_APP_SECRET`]) || process.env.KIS_APP_SECRET,
			cano: process.env[`KIS_${aliasAccountKey}_CANO`] || process.env.KIS_ACCOUNT_CANO,
			prdt: process.env[`KIS_${aliasAccountKey}_PRDT`] || process.env.KIS_ACCOUNT_PRDT
		};
	}
	// VTS: typically a single mock account; alias respected if configured.
	const vtsAccountKey = alias === 'main' ? 'VTS_ACCOUNT' : `VTS_${aliasUpper}`;
	return {
		live: false,
		alias,
		baseUrl: KIS_VTS_URL,
		appkey: (alias !== 'main' && process.env[`KIS_VTS_${aliasUpper}_APP_KEY`]) || process.env.KIS_VTS_APP_KEY || process.env.KIS_APP_KEY,
		appsecret: (alias !== 'main' && process.env[`KIS_VTS_${aliasUpper}_APP_SECRET`]) || process.env.KIS_VTS_APP_SECRET || process.env.KIS_APP_SECRET,
		cano: process.env[`KIS_${vtsAccountKey}_CANO`] || process.env.KIS_VTS_ACCOUNT_CANO || process.env.KIS_ACCOUNT_CANO,
		prdt: process.env[`KIS_${vtsAccountKey}_PRDT`] || process.env.KIS_VTS_ACCOUNT_PRDT || process.env.KIS_ACCOUNT_PRDT
	};
};

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

// ─────────────────────────────────────────────────────────────────────────────
// Trading: token + balance inquiry
// ─────────────────────────────────────────────────────────────────────────────

const _tradeTokenRefresh = {};

// Token cache key includes alias so accounts with their own App Key/Secret
// (e.g. pension) get an independent token, not a stale token issued for the
// main app key.
async function getKisTradeToken (overrideLive, forceRefresh = false, account) {
	const ctx = tradeContext(overrideLive, account);
	if (!ctx.appkey || !ctx.appsecret) {
		throw new Error(`KIS ${ctx.live ? 'LIVE' : 'VTS'} app key/secret not set for alias=${ctx.alias}`);
	}
	const namespace = `kis_${ctx.live ? 'live' : 'vts'}_${ctx.alias}`;
	const cacheKey = `${namespace}_access_token`;
	const expiredKey = `${namespace}_access_token_expired`;

	if (!forceRefresh) {
		const accessToken = await storage.getItem(cacheKey);
		const expired = await storage.getItem(expiredKey);
		if (accessToken && expired) {
			const expireTime = moment(expired, 'YYYY-MM-DD HH:mm:ss').tz('Asia/Seoul');
			const now = moment().tz('Asia/Seoul');
			if (now < expireTime) return accessToken;
		}
	}

	if (_tradeTokenRefresh[namespace]) {
		return await _tradeTokenRefresh[namespace];
	}

	_tradeTokenRefresh[namespace] = (async () => {
		await storage.removeItem(cacheKey);
		await storage.removeItem(expiredKey);
		const response = await fetchWithRetry(`${ctx.baseUrl}/oauth2/tokenP`, {
			method: 'POST',
			headers: { 'content-type': 'application/json; charset=utf-8' },
			body: JSON.stringify({ 'grant_type': 'client_credentials', appkey: ctx.appkey, appsecret: ctx.appsecret })
		});
		const result = await response.json();
		if (result.access_token) {
			await storage.setItem(cacheKey, result.access_token);
			await storage.setItem(expiredKey, result.access_token_token_expired);
		}
		return result.access_token;
	})().finally(() => {
		_tradeTokenRefresh[namespace] = null;
	});

	return await _tradeTokenRefresh[namespace];
}

const requireAccount = (ctx) => {
	if (!ctx.cano || !ctx.prdt) {
		throw new Error(`KIS ${ctx.live ? 'LIVE' : 'VTS'} account (CANO/PRDT) not set in env`);
	}
};

// Domestic (KR) balance — paginates via CTX_AREA_*100. Returns the merged
// holdings array and the last page's summary (output2).
async function getKisDomesticBalance ({ live, account } = {}) {
	const ctx = tradeContext(live, account);
	requireAccount(ctx);
	const token = await getKisTradeToken(live, false, account);
	const trId = ctx.live ? 'TTTC8434R' : 'VTTC8434R';

	const allHoldings = [];
	let summary = null;
	let CTX_FK = '';
	let CTX_NK = '';
	let trCont = '';

	for (let page = 0; page < 20; page++) {
		const params = new URLSearchParams({
			CANO: ctx.cano,
			ACNT_PRDT_CD: ctx.prdt,
			AFHR_FLPR_YN: 'N',
			OFL_YN: '',
			INQR_DVSN: '02',
			UNPR_DVSN: '01',
			FUND_STTL_ICLD_YN: 'N',
			FNCG_AMT_AUTO_RDPT_YN: 'N',
			PRCS_DVSN: '01',
			CTX_AREA_FK100: CTX_FK,
			CTX_AREA_NK100: CTX_NK
		});
		const headers = {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Bearer ${token}`,
			appkey: ctx.appkey,
			appsecret: ctx.appsecret,
			'tr_id': trId,
			'tr_cont': trCont
		};
		const url = `${ctx.baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance?${params}`;
		const response = await fetchWithRetry(url, { method: 'GET', headers });
		const data = await response.json();
		if (data.rt_cd && data.rt_cd !== '0') {
			throw new Error(`KIS domestic balance: ${data.msg_cd || ''} ${data.msg1 || ''}`.trim());
		}
		if (Array.isArray(data.output1)) allHoldings.push(...data.output1);
		if (Array.isArray(data.output2) && data.output2.length > 0) summary = data.output2[0];
		const cont = (data.tr_cont || response.headers.get('tr_cont') || '').trim();
		if (cont !== 'M' && cont !== 'F') break;
		trCont = 'N';
		CTX_FK = data.ctx_area_fk100 || '';
		CTX_NK = data.ctx_area_nk100 || '';
	}

	return { holdings: allHoldings, summary };
}

// Overseas (US/HK/...) balance for a single exchange.
async function getKisOverseasBalanceForExchange ({ live, exchange = 'NASD', currency = 'USD', account } = {}) {
	const ctx = tradeContext(live, account);
	requireAccount(ctx);
	const token = await getKisTradeToken(live, false, account);
	const trId = ctx.live ? 'TTTS3012R' : 'VTTS3012R';

	const allHoldings = [];
	let summary = null;
	let CTX_FK = '';
	let CTX_NK = '';
	let trCont = '';

	for (let page = 0; page < 20; page++) {
		const params = new URLSearchParams({
			CANO: ctx.cano,
			ACNT_PRDT_CD: ctx.prdt,
			OVRS_EXCG_CD: exchange,
			TR_CRCY_CD: currency,
			CTX_AREA_FK200: CTX_FK,
			CTX_AREA_NK200: CTX_NK
		});
		const headers = {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Bearer ${token}`,
			appkey: ctx.appkey,
			appsecret: ctx.appsecret,
			'tr_id': trId,
			'tr_cont': trCont
		};
		const url = `${ctx.baseUrl}/uapi/overseas-stock/v1/trading/inquire-balance?${params}`;
		const response = await fetchWithRetry(url, { method: 'GET', headers });
		const data = await response.json();
		if (data.rt_cd && data.rt_cd !== '0') {
			throw new Error(`KIS overseas balance (${exchange}): ${data.msg_cd || ''} ${data.msg1 || ''}`.trim());
		}
		if (Array.isArray(data.output1)) allHoldings.push(...data.output1);
		if (data.output2) summary = Array.isArray(data.output2) ? data.output2[0] : data.output2;
		const cont = (data.tr_cont || response.headers.get('tr_cont') || '').trim();
		if (cont !== 'M' && cont !== 'F') break;
		trCont = 'N';
		CTX_FK = data.ctx_area_fk200 || '';
		CTX_NK = data.ctx_area_nk200 || '';
	}

	return { exchange, currency, holdings: allHoldings, summary };
}

// Sweep all US exchanges (NASD/NYSE/AMEX). Merges identical symbols across
// exchanges by summing quantities; preserves per-exchange detail too.
async function getKisOverseasBalance ({ live, currency = 'USD', exchanges = ['NASD', 'NYSE', 'AMEX'], account } = {}) {
	const perExchange = [];
	for (const ex of exchanges) {
		try {
			perExchange.push(await getKisOverseasBalanceForExchange({ live, exchange: ex, currency, account }));
		} catch (err) {
			perExchange.push({ exchange: ex, currency, holdings: [], summary: null, error: err.message });
		}
	}
	const merged = new Map();
	for (const r of perExchange) {
		for (const h of (r.holdings || [])) {
			const key = h.ovrs_pdno || h.pdno;
			if (!merged.has(key)) {
				merged.set(key, { ...h, _exchanges: [r.exchange] });
			} else {
				const prev = merged.get(key);
				prev.ovrs_cblc_qty = String(Number(prev.ovrs_cblc_qty || 0) + Number(h.ovrs_cblc_qty || 0));
				prev._exchanges.push(r.exchange);
			}
		}
	}
	return { holdings: Array.from(merged.values()), perExchange };
}

// Total assets / FX cash by currency. Useful to surface USD cash separately
// from the per-exchange position summaries.
async function getKisOverseasPresentBalance ({ live, account } = {}) {
	const ctx = tradeContext(live, account);
	requireAccount(ctx);
	const token = await getKisTradeToken(live, false, account);
	const trId = ctx.live ? 'CTRP6504R' : 'VTRP6504R';

	const params = new URLSearchParams({
		CANO: ctx.cano,
		ACNT_PRDT_CD: ctx.prdt,
		WCRC_FRCR_DVSN_CD: '02',
		NATN_CD: '000',
		TR_MKET_CD: '00',
		INQR_DVSN_CD: '00'
	});
	const headers = {
		'content-type': 'application/json; charset=utf-8',
		authorization: `Bearer ${token}`,
		appkey: ctx.appkey,
		appsecret: ctx.appsecret,
		'tr_id': trId
	};
	const url = `${ctx.baseUrl}/uapi/overseas-stock/v1/trading/inquire-present-balance?${params}`;
	const response = await fetchWithRetry(url, { method: 'GET', headers });
	const data = await response.json();
	if (data.rt_cd && data.rt_cd !== '0') {
		throw new Error(`KIS overseas present balance: ${data.msg_cd || ''} ${data.msg1 || ''}`.trim());
	}
	return data;
}

exports.getKisToken = getKisToken;
exports.getKisQuoteKorea = getKisQuoteKorea;
exports.getKisQuoteUS = getKisQuoteUS;
exports.getKisExchangeRate = getKisExchangeRate;
exports.getKisDailyPriceUS = getKisDailyPriceUS;
exports.getKisDailyPriceUSWithDate = getKisDailyPriceUSWithDate;
exports.getKisWeeklyPriceUS = getKisWeeklyPriceUS;
exports.getKisWeeklyPriceKorea = getKisWeeklyPriceKorea;
// ─────────────────────────────────────────────────────────────────────────────
// Trading: order placement + order history
// ─────────────────────────────────────────────────────────────────────────────

// hashkey is required on every POST trade request — KIS verifies the body
// hasn't been tampered with by re-hashing on their side.
async function getKisHashkey ({ live, body } = {}) {
	const ctx = tradeContext(live);
	const headers = {
		'content-type': 'application/json; charset=utf-8',
		appkey: ctx.appkey,
		appsecret: ctx.appsecret
	};
	const response = await fetchWithRetry(`${ctx.baseUrl}/uapi/hashkey`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});
	const data = await response.json();
	if (!data.HASH) {
		throw new Error(`KIS hashkey: missing HASH (${data.error_code || ''} ${data.error_description || ''})`.trim());
	}
	return data.HASH;
}

// KR cash order. side=buy|sell, ordType='00' 지정가 / '01' 시장가.
async function placeKisDomesticOrder ({ live, side, symbol, quantity, price, ordType = '00', account } = {}) {
	const ctx = tradeContext(live, account);
	requireAccount(ctx);
	if (!['buy', 'sell'].includes(side)) throw new Error('side must be "buy" or "sell"');
	if (!symbol) throw new Error('symbol required');
	if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) throw new Error('quantity must be > 0');
	if (ordType === '00' && (!Number.isFinite(Number(price)) || Number(price) <= 0)) {
		throw new Error('price must be > 0 for limit order');
	}
	const token = await getKisTradeToken(live, false, account);
	const trIdMap = {
		live: { buy: 'TTTC0802U', sell: 'TTTC0801U' },
		vts: { buy: 'VTTC0802U', sell: 'VTTC0801U' }
	};
	const trId = trIdMap[ctx.live ? 'live' : 'vts'][side];

	const body = {
		CANO: ctx.cano,
		ACNT_PRDT_CD: ctx.prdt,
		PDNO: String(symbol),
		ORD_DVSN: ordType,
		ORD_QTY: String(quantity),
		ORD_UNPR: ordType === '01' ? '0' : String(price)
	};
	const hashkey = await getKisHashkey({ live, body });
	const headers = {
		'content-type': 'application/json; charset=utf-8',
		authorization: `Bearer ${token}`,
		appkey: ctx.appkey,
		appsecret: ctx.appsecret,
		'tr_id': trId,
		hashkey
	};
	const response = await fetchWithRetry(`${ctx.baseUrl}/uapi/domestic-stock/v1/trading/order-cash`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});
	const data = await response.json();
	if (data.rt_cd && data.rt_cd !== '0') {
		throw new Error(`KIS domestic order: ${data.msg_cd || ''} ${data.msg1 || ''}`.trim());
	}
	return data;
}

// US order — only LIMIT (ORD_DVSN='00') is supported here. Price is in the
// quote currency (USD). Exchange code: NASD/NYSE/AMEX.
async function placeKisOverseasOrder ({ live, side, symbol, exchange = 'NASD', quantity, price, ordType = '00', account } = {}) {
	const ctx = tradeContext(live, account);
	requireAccount(ctx);
	if (!['buy', 'sell'].includes(side)) throw new Error('side must be "buy" or "sell"');
	if (!symbol) throw new Error('symbol required');
	if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) throw new Error('quantity must be > 0');
	if (!Number.isFinite(Number(price)) || Number(price) <= 0) throw new Error('price must be > 0');
	const token = await getKisTradeToken(live, false, account);
	const trIdMap = {
		live: { buy: 'TTTT1002U', sell: 'TTTT1006U' },
		vts: { buy: 'VTTT1002U', sell: 'VTTT1001U' }
	};
	const trId = trIdMap[ctx.live ? 'live' : 'vts'][side];

	const body = {
		CANO: ctx.cano,
		ACNT_PRDT_CD: ctx.prdt,
		OVRS_EXCG_CD: exchange,
		PDNO: String(symbol),
		ORD_QTY: String(quantity),
		OVRS_ORD_UNPR: String(price),
		ORD_SVR_DVSN_CD: '0',
		ORD_DVSN: ordType
	};
	const hashkey = await getKisHashkey({ live, body });
	const headers = {
		'content-type': 'application/json; charset=utf-8',
		authorization: `Bearer ${token}`,
		appkey: ctx.appkey,
		appsecret: ctx.appsecret,
		'tr_id': trId,
		hashkey
	};
	const response = await fetchWithRetry(`${ctx.baseUrl}/uapi/overseas-stock/v1/trading/order`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});
	const data = await response.json();
	if (data.rt_cd && data.rt_cd !== '0') {
		throw new Error(`KIS overseas order: ${data.msg_cd || ''} ${data.msg1 || ''}`.trim());
	}
	return data;
}

// KR 일별 주문/체결 내역. 빈 from/to → 오늘 1일.
async function getKisDomesticOrderHistory ({ live, from, to, account } = {}) {
	const ctx = tradeContext(live, account);
	requireAccount(ctx);
	const token = await getKisTradeToken(live, false, account);
	const trId = ctx.live ? 'TTTC8001R' : 'VTTC8001R';
	const today = moment().tz('Asia/Seoul').format('YYYYMMDD');
	const params = new URLSearchParams({
		CANO: ctx.cano,
		ACNT_PRDT_CD: ctx.prdt,
		INQR_STRT_DT: (from || today).replace(/-/g, ''),
		INQR_END_DT: (to || today).replace(/-/g, ''),
		SLL_BUY_DVSN_CD: '00',
		INQR_DVSN: '00',
		PDNO: '',
		CCLD_DVSN: '00',
		ORD_GNO_BRNO: '',
		ODNO: '',
		INQR_DVSN_3: '00',
		INQR_DVSN_1: '',
		CTX_AREA_FK100: '',
		CTX_AREA_NK100: ''
	});
	const headers = {
		'content-type': 'application/json; charset=utf-8',
		authorization: `Bearer ${token}`,
		appkey: ctx.appkey,
		appsecret: ctx.appsecret,
		'tr_id': trId
	};
	const url = `${ctx.baseUrl}/uapi/domestic-stock/v1/trading/inquire-daily-ccld?${params}`;
	const response = await fetchWithRetry(url, { method: 'GET', headers });
	const data = await response.json();
	if (data.rt_cd && data.rt_cd !== '0') {
		throw new Error(`KIS domestic ccld: ${data.msg_cd || ''} ${data.msg1 || ''}`.trim());
	}
	return data;
}

// US 일별 주문/체결 내역.
async function getKisOverseasOrderHistory ({ live, from, to, account } = {}) {
	const ctx = tradeContext(live, account);
	requireAccount(ctx);
	const token = await getKisTradeToken(live, false, account);
	const trId = ctx.live ? 'TTTS3035R' : 'VTTS3035R';
	const today = moment().tz('Asia/Seoul').format('YYYYMMDD');
	const params = new URLSearchParams({
		CANO: ctx.cano,
		ACNT_PRDT_CD: ctx.prdt,
		PDNO: '',
		ORD_STRT_DT: (from || today).replace(/-/g, ''),
		ORD_END_DT: (to || today).replace(/-/g, ''),
		SLL_BUY_DVSN: '00',
		CCLD_NCCS_DVSN: '00',
		OVRS_EXCG_CD: '',
		SORT_SQN: 'DS',
		ORD_DT: '',
		ORD_GNO_BRNO: '',
		ODNO: '',
		CTX_AREA_NK200: '',
		CTX_AREA_FK200: ''
	});
	const headers = {
		'content-type': 'application/json; charset=utf-8',
		authorization: `Bearer ${token}`,
		appkey: ctx.appkey,
		appsecret: ctx.appsecret,
		'tr_id': trId
	};
	const url = `${ctx.baseUrl}/uapi/overseas-stock/v1/trading/inquire-ccnl?${params}`;
	const response = await fetchWithRetry(url, { method: 'GET', headers });
	const data = await response.json();
	if (data.rt_cd && data.rt_cd !== '0') {
		throw new Error(`KIS overseas ccnl: ${data.msg_cd || ''} ${data.msg1 || ''}`.trim());
	}
	return data;
}

exports.tradeContext = tradeContext;
exports.getKisTradeToken = getKisTradeToken;
exports.getKisDomesticBalance = getKisDomesticBalance;
exports.getKisOverseasBalanceForExchange = getKisOverseasBalanceForExchange;
exports.getKisOverseasBalance = getKisOverseasBalance;
exports.getKisOverseasPresentBalance = getKisOverseasPresentBalance;
exports.getKisHashkey = getKisHashkey;
exports.placeKisDomesticOrder = placeKisDomesticOrder;
exports.placeKisOverseasOrder = placeKisOverseasOrder;
exports.getKisDomesticOrderHistory = getKisDomesticOrderHistory;
exports.getKisOverseasOrderHistory = getKisOverseasOrderHistory;