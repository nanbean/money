const moment = require('moment-timezone');
const stockDB = require('../db/stockDB');
const accountDB = require('../db/accountDB');
const { getInvestmentsFromAccounts } = require('../utils/investment');
const { singleFlight } = require('../utils/singleFlight');
const { getTossPrices, getTossKrPreviousClose, getTossPreviousClose, mapWithRateLimit } = require('./tossConnector');
const { isKrRegularSession } = require('../utils/marketHours');

// Append today's price to weeklyPrices array, keep last 10 trading days
const updateWeeklyPrices = (existing = [], date, price) => {
	const filtered = existing.filter(p => p.date !== date);
	return [...filtered, { date, price }].slice(-10);
};

// 'KRX:005930' → '005930', 'NASDAQ:AAPL' → 'AAPL'
const toTossSymbol = (googleSymbol) => String(googleSymbol || '').split(':')[1] || '';

// fetchPrevClose 는 숫자 또는 { close, sessionDate } 를 준다. 세션일을 함께 주는
// 시장(US)은 그 값이 prevCloseDate 가 된다 — 달력 날짜와 어긋나는 구간이 있다.
const normalizePrevClose = (value) => {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number') {
		return Number.isFinite(value) ? { close: value, sessionDate: null } : null;
	}
	const close = parseFloat(value.close);
	return Number.isFinite(close) ? { close, sessionDate: value.sessionDate || null } : null;
};

// 토스 현재가 API 는 등락률을 주지 않아 직전 세션 종가로 직접 계산한다.
//
// KR 은 종목당 캔들 1콜이 필요하므로 stock 문서에 (prevClose, prevCloseDate) 로 캐시해
// 하루 한 번만 조회한다. US 는 캐시하지 않는다(alwaysFetch) — 야간 세션이 다음 거래일로
// 집계되어 세션일이 달력 날짜보다 하루 앞서는 구간이 있고, 그 구간에서는 날짜 비교로
// 신선도를 판정할 수 없다. 보유 종목이 적어 매번 조회해도 몇 초면 끝난다.
const fetchPreviousCloses = async (investments, existingData, date, fetchOne, { alwaysFetch = false } = {}) => {
	const targets = alwaysFetch ? investments : investments.filter((i) => {
		const prev = existingData.find(d => d.googleSymbol === i.googleSymbol);
		return !prev || prev.prevCloseDate !== date || !Number.isFinite(prev.prevClose);
	});

	if (targets.length === 0) return new Map();

	const results = await mapWithRateLimit(targets, i => fetchOne(toTossSymbol(i.googleSymbol)));

	const map = new Map();
	for (const r of results) {
		if (r.error) {
			console.error(`previous close failed for ${r.item.googleSymbol}:`, r.error?.message || r.error?.stack || r.error);
			continue;
		}
		const normalized = normalizePrevClose(r.value);
		if (normalized) map.set(r.item.googleSymbol, normalized);
	}
	return map;
};

// prevCloseDate 는 '이 prevClose 가 유효한 세션'을 뜻한다. 방금 조회했으면 그 세션을
// 쓰고, 실패했으면 기존 값을 그대로 둬서 다음 실행에서 다시 시도한다.
const resolvePrevClose = (item, freshMap, date) => {
	const fresh = freshMap.get(item.googleSymbol);
	if (fresh) {
		return { prevClose: fresh.close, prevCloseDate: fresh.sessionDate || date, fresh: true };
	}
	return { prevClose: item.prevClose, prevCloseDate: item.prevCloseDate, fresh: false };
};

// 등락률은 (a) 직전 세션 종가를 방금 받았을 때, 또는 (b) 캐시된 종가가 오늘 것일 때만
// 갱신한다. 며칠 지난 종가로 계산하면 '전일대비'가 아니게 되므로 그때는 기존 값을 둔다.
const calcRate = (price, prevClose, prevCloseDate, date, fresh) => {
	if (!fresh && prevCloseDate !== date) return undefined;
	if (!Number.isFinite(prevClose) || prevClose <= 0) return undefined;
	// KIS 의 prdy_ctrt 가 소수점 둘째 자리까지만 주던 것과 맞춘다. 원시 float 를 그대로
	// 저장하면 화면에 -0.2961766289714593% 처럼 찍힌다.
	return Math.round(((price - prevClose) / prevClose) * 10000) / 100;
};

const _arrangeInvestment = async ({ stockId, marketTz, parsePrice, fetchPrevClose, alwaysFetchPrevClose, isRegularSession, label }) => {
	const allAccounts = await accountDB.listAccounts();
	const stockResponse = await stockDB.getStock(stockId);
	const investments = getInvestmentsFromAccounts(stockResponse.data, allAccounts).filter(i => i.quantity > 0);

	// 토스 lastPrice 는 마지막 체결가라 정규장이 끝나면 시간외 체결가로 바뀐다.
	// 그걸 전일 종가와 비교하면 홈 Stock List 에 장외 등락률이 찍힌다.
	//
	// 국내는 NXT 애프터마켓(15:40~20:00)이 붙어 있어 장 종료 후 갱신하면 정규장
	// 등락률이 장외 값으로 덮인다. 그래서 KR 만 정규장으로 게이트한다. 마감 직후
	// 크론(15:30:30)은 CLOSE_GRACE_MINUTES 안이라 정규장으로 취급되어 종가를 잡고,
	// 그 값이 다음 개장까지 유지된다.
	//
	// 미국은 게이트하지 않는다(isRegularSession 미지정). 마감 크론(16:00:30 ET)이
	// 전일 종가 대비 정규장 등락률을 남기고, 이후 한국장 마감 크론이 애프터마켓
	// 값으로 갱신하는 것은 의도된 동작이다.
	const regular = isRegularSession ? isRegularSession() : true;
	const priceOf = (googleSymbol) => stockResponse.data.find(d => d.googleSymbol === googleSymbol)?.price;
	if (!regular) {
		// 가격이 아직 없는 종목(신규 편입 등)은 장외 시세라도 채워야 화면이 빈칸이 안 된다.
		const unpriced = investments.filter(i => !Number.isFinite(priceOf(i.googleSymbol)));
		if (unpriced.length === 0) {
			console.log(`${label}: 정규장 아님 — 정규장 종가 유지 (${investments.length}종목)`);
			return;
		}
		console.log(`${label}: 정규장 아님 — 가격 없는 ${unpriced.length}종목만 채운다`);
	}

	const date = moment().tz(marketTz).format('YYYY-MM-DD');

	// 현재가는 다건 조회 1콜로 끝난다 (최대 200종목).
	const priceMap = await getTossPrices(investments.map(i => toTossSymbol(i.googleSymbol)));
	const prevCloseMap = await fetchPreviousCloses(
		investments, stockResponse.data, date, fetchPrevClose, { alwaysFetch: alwaysFetchPrevClose }
	);

	await stockDB.insertStock({
		...stockResponse,
		date,
		data: stockResponse.data.map((i) => {
			const quote = priceMap.get(toTossSymbol(i.googleSymbol));
			const price = parsePrice(quote?.lastPrice);

			if (!Number.isFinite(price)) return i;

			// 장외에는 가격이 비어 있던 종목만 채운다. 나머지는 정규장 종가 유지.
			if (!regular && Number.isFinite(i.price)) return i;

			const { prevClose, prevCloseDate, fresh } = resolvePrevClose(i, prevCloseMap, date);
			const rate = calcRate(price, prevClose, prevCloseDate, date, fresh);

			// weeklyPrices 는 가격이 속한 세션으로 키를 잡는다. 야간에는 세션일이 달력
			// 날짜보다 하루 앞서므로, 달력 날짜로 쓰면 야간 가격이 전날 종가를 덮어쓴다.
			const priceDate = fresh && prevCloseDate ? prevCloseDate : date;

			return {
				...i,
				price,
				rate: rate === undefined ? i.rate : rate,
				prevClose,
				prevCloseDate,
				weeklyPrices: updateWeeklyPrices(i.weeklyPrices, priceDate, price)
			};
		})
	});
};

const _arrangeKRInvestmemt = () => _arrangeInvestment({
	stockId: 'kospi',
	marketTz: 'Asia/Seoul',
	// KRW 호가는 정수. 소수점이 붙어 와도 잘라낸다.
	parsePrice: (v) => {
		const n = parseFloat(v);
		return Number.isFinite(n) ? Math.round(n) : NaN;
	},
	fetchPrevClose: getTossKrPreviousClose,
	isRegularSession: isKrRegularSession,
	label: 'arrangeKRInvestmemt'
});

const _arrangeUSInvestmemt = () => _arrangeInvestment({
	stockId: 'us',
	// 반드시 거래소 시간대여야 한다. getTossPreviousClose 는 일봉의 세션일을
	// America/New_York 으로 판정하므로, 기준일을 다른 시간대로 잡으면 어긋난다.
	//
	// 예전에는 America/Los_Angeles 였다. ET 자정부터 PT 자정까지 3시간 동안 ET 날짜는
	// 넘어갔는데 date 는 그대로여서, 저장된 prevCloseDate 가 '오늘'로 판정되어 재조회를
	// 건너뛰었다. 그 사이 가격은 새 세션(야간) 값으로 갱신되는데 prevClose 는 이틀 전
	// 종가에 묶여, 등락률이 이틀치를 섞어 계산됐다. 실측 예 — TSLA 를 08-27 세션
	// 가격으로 08-25 종가와 비교해 -0.99% 로 표시(올바른 값은 08-26 종가 대비 +0.21%).
	// weeklyPrices 의 날짜 키도 한 칸 밀려 야간 가격이 전날 종가를 덮어썼다.
	//
	// date 는 여전히 달력 날짜라 야간 세션(20:00 ET~)에는 세션일보다 하루 뒤진다.
	// 그래서 prevClose 는 캐시하지 않고 매번 조회해 세션일을 함께 받는다.
	marketTz: 'America/New_York',
	parsePrice: (v) => parseFloat(v),
	fetchPrevClose: getTossPreviousClose,
	alwaysFetchPrevClose: true,
	label: 'arrangeUSInvestmemt'
});

const arrangeKRInvestmemt = singleFlight('arrangeKRInvestmemt', _arrangeKRInvestmemt);
const arrangeUSInvestmemt = singleFlight('arrangeUSInvestmemt', _arrangeUSInvestmemt);

module.exports = {
	arrangeKRInvestmemt,
	arrangeUSInvestmemt
};
