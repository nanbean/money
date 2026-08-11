const localdb = require('node-persist');
const moment = require('moment-timezone');

const TOSS_URL = 'https://openapi.tossinvest.com';

// 현재가 다건 조회 상한 (docs: symbols 최대 200개).
const PRICE_BATCH_SIZE = 200;

// kisConnector 와 같은 기본 저장소를 쓰되 키는 toss_ 로 네임스페이스한다.
const storage = localdb.create({ ttl: true, logging: false });
storage.init();

const isNetworkError = (err) => {
	return err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND';
};

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// 5xx/429 는 재시도. 429 는 Retry-After 를 우선 존중하고 없으면 지수 백오프.
const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
	for (let i = 0; i < retries; i++) {
		try {
			const response = await fetch(url, options);
			if (response.status === 429) {
				const retryAfter = parseFloat(response.headers.get('retry-after'));
				if (i === retries - 1) return response;
				await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : delay * (i + 1));
				continue;
			}
			if (!response.ok && response.status >= 500) {
				throw new Error(`HTTP Error ${response.status}`);
			}
			return response;
		} catch (err) {
			if (i === retries - 1) throw err;
			await sleep(delay * (i + 1));
		}
	}
};

// 토스 에러 envelope: { error: { code, message, requestId } }
const tossError = (label, status, body) => {
	const code = body?.error?.code || '';
	const message = body?.error?.message || '';
	return new Error(`toss ${label}: ${status} ${code} ${message}`.trim());
};

let _tokenRefreshPromise = null;

// client 당 유효한 access token 은 1개뿐이라 재발급 시 이전 토큰이 즉시 무효화된다.
// (같은 client_id 를 dev/prod 가 동시에 쓰면 서로를 무효화시킴 — 키를 분리할 것)
// 그래서 동시 갱신을 single-flight 로 묶고, 캐시는 만료 60초 전에 미리 비운다.
async function getTossToken (forceRefresh = false) {
	if (!process.env.TOSS_CLIENT_ID || !process.env.TOSS_CLIENT_SECRET) {
		throw new Error('TOSS_CLIENT_ID / TOSS_CLIENT_SECRET not set in env');
	}

	if (!forceRefresh) {
		const accessToken = await storage.getItem('toss_access_token');
		const expiresAt = await storage.getItem('toss_access_token_expires_at');
		if (accessToken && expiresAt && moment().valueOf() < expiresAt) {
			return accessToken;
		}
	}

	if (_tokenRefreshPromise) {
		return await _tokenRefreshPromise;
	}

	_tokenRefreshPromise = (async () => {
		await storage.removeItem('toss_access_token');
		await storage.removeItem('toss_access_token_expires_at');

		const body = new URLSearchParams({
			'grant_type': 'client_credentials',
			'client_id': process.env.TOSS_CLIENT_ID,
			'client_secret': process.env.TOSS_CLIENT_SECRET
		});
		const response = await fetchWithRetry(`${TOSS_URL}/oauth2/token`, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: body.toString()
		});
		const result = await response.json();
		if (!response.ok || !result.access_token) {
			throw tossError('token', response.status, result);
		}
		// expires_in 은 초 단위. 만료 직전 요청이 401 로 새지 않도록 60초 마진을 뺀다.
		const expiresAt = moment().valueOf() + Math.max((Number(result.expires_in) || 0) - 60, 30) * 1000;
		await storage.setItem('toss_access_token', result.access_token);
		await storage.setItem('toss_access_token_expires_at', expiresAt);
		return result.access_token;
	})().finally(() => {
		_tokenRefreshPromise = null;
	});

	return await _tokenRefreshPromise;
}

// 401(invalid/expired token) 이면 토큰을 강제 갱신해 한 번만 재시도한다.
async function tossGet (path, label) {
	const doRequest = async (token) => {
		const response = await fetchWithRetry(`${TOSS_URL}${path}`, {
			method: 'GET',
			headers: {
				authorization: `Bearer ${token}`,
				accept: 'application/json'
			}
		});
		const body = await response.json().catch(() => null);
		return { response, body };
	};

	let token = await getTossToken();
	let { response, body } = await doRequest(token);

	if (response.status === 401) {
		console.warn(`${label}: 401, refreshing toss token and retrying...`);
		token = await getTossToken(true);
		({ response, body } = await doRequest(token));
	}

	if (!response.ok) {
		throw tossError(label, response.status, body);
	}
	return body;
}

const chunk = (arr, size) => {
	const out = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
};

// 현재가 다건 조회. symbols 는 토스 심볼 배열(KRX 6자리 또는 US 티커).
// 반환: Map<symbol, { symbol, lastPrice, currency, timestamp }>
// 200개 초과분은 자동 분할하며, 일부 배치가 실패해도 나머지는 살린다.
async function getTossPrices (symbols) {
	const unique = [...new Set((symbols || []).filter(Boolean))];
	if (unique.length === 0) return new Map();

	const batches = chunk(unique, PRICE_BATCH_SIZE);
	const settled = await Promise.allSettled(
		batches.map(batch => tossGet(`/api/v1/prices?symbols=${encodeURIComponent(batch.join(','))}`, 'prices'))
	);

	const priceMap = new Map();
	settled.forEach((r, idx) => {
		if (r.status === 'rejected') {
			console.error(`getTossPrices batch ${idx} failed:`, r.reason?.message || r.reason);
			return;
		}
		for (const item of (r.value?.result || [])) {
			if (item && item.symbol) priceMap.set(item.symbol, item);
		}
	});
	return priceMap;
}

// 1 USD = ? KRW. 문서상 rate 는 매수 환율, midRate 는 매매기준율.
// 기존 KIS 값(frst_bltn_exrt = 최초고시환율, 매매기준율 성격)과 맞추기 위해 midRate 를 우선한다.
async function getTossExchangeRate () {
	const body = await tossGet('/api/v1/exchange-rate?baseCurrency=USD&quoteCurrency=KRW', 'exchange-rate');
	const result = body?.result;
	const rate = parseFloat(result?.midRate ?? result?.rate);
	return Number.isFinite(rate) ? rate : null;
}

// 일봉 조회. 반환: Candle 배열 (API 응답 순서 그대로).
async function getTossDailyCandles (symbol, count = 2, { adjusted = true } = {}) {
	const params = new URLSearchParams({
		symbol,
		interval: '1d',
		count: String(count),
		adjusted: String(adjusted)
	});
	const body = await tossGet(`/api/v1/candles?${params}`, `candles(${symbol})`);
	return body?.result?.candles || [];
}

// 국내 종목의 KRX 기준가(= 전일 정규장 종가).
//
// 토스 일봉은 KRX+NXT 통합 기준이라 종가에 NXT 애프터마켓(~20:00) 체결가가 섞인다.
// 실측 결과 네이버/KIS 가 보여주는 KRX 정규장 종가와 최대 2% 까지 벌어져서 '전일대비'
// 계산에 쓸 수 없다. 대신 상/하한가는 KRX 기준가의 ±30% 이므로 두 값의 평균으로
// 기준가를 그대로 복원한다 (실측 8종목 중 7종목 정확히 일치).
// 호가단위 반올림 때문에 최대 호가단위/2 (≈0.03~0.1%) 오차가 남을 수 있다.
async function getTossKrPreviousClose (symbol) {
	const body = await tossGet(`/api/v1/price-limits?symbol=${encodeURIComponent(symbol)}`, `price-limits(${symbol})`);
	const upper = parseFloat(body?.result?.upperLimitPrice);
	const lower = parseFloat(body?.result?.lowerLimitPrice);
	if (!Number.isFinite(upper) || !Number.isFinite(lower)) return null;
	return (upper + lower) / 2;
}

// 미국 종목의 전일 종가. 미국장은 NXT 같은 별도 세션 이슈가 없어 일봉 종가가
// KIS 등락률과 소수점 둘째 자리까지 일치한다. 장중에는 당일 봉이 섞여 오므로
// marketTz 기준 오늘 날짜 봉은 제외하고 가장 최근 봉의 종가를 쓴다.
async function getTossPreviousClose (symbol, marketTz) {
	const candles = await getTossDailyCandles(symbol, 3);
	const today = moment().tz(marketTz).format('YYYY-MM-DD');
	const past = candles
		.filter(c => c && c.timestamp && moment(c.timestamp).tz(marketTz).format('YYYY-MM-DD') !== today)
		.sort((a, b) => moment(a.timestamp).valueOf() - moment(b.timestamp).valueOf());
	const last = past[past.length - 1];
	const close = parseFloat(last?.closePrice);
	return Number.isFinite(close) ? close : null;
}

// Rate limit 대응용 순차 실행기. MARKET_DATA_CHART 는 초당 5회라
// 요청 사이에 최소 간격을 둔다.
async function mapWithRateLimit (items, fn, { intervalMs = 250 } = {}) {
	const out = [];
	for (const item of items) {
		try {
			out.push({ item, value: await fn(item), error: null });
		} catch (err) {
			out.push({ item, value: null, error: err });
		}
		await sleep(intervalMs);
	}
	return out;
}

module.exports = {
	TOSS_URL,
	getTossToken,
	tossGet,
	getTossPrices,
	getTossExchangeRate,
	getTossDailyCandles,
	getTossKrPreviousClose,
	getTossPreviousClose,
	mapWithRateLimit,
	isNetworkError
};
