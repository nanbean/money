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

// 토스 현재가 API 는 등락률을 주지 않아 전일 종가로 직접 계산한다. 종목당 캔들 1콜이
// 필요하므로 stock 문서에 (prevClose, prevCloseDate) 로 캐시해 하루 한 번만 조회한다.
const fetchPreviousCloses = async (investments, existingData, date, fetchOne) => {
	const stale = investments.filter((i) => {
		const prev = existingData.find(d => d.googleSymbol === i.googleSymbol);
		return !prev || prev.prevCloseDate !== date || !Number.isFinite(prev.prevClose);
	});

	if (stale.length === 0) return new Map();

	const results = await mapWithRateLimit(stale, i => fetchOne(toTossSymbol(i.googleSymbol)));

	const map = new Map();
	for (const r of results) {
		if (r.error) {
			console.error(`previous close failed for ${r.item.googleSymbol}:`, r.error.message || r.error);
			continue;
		}
		if (Number.isFinite(r.value)) map.set(r.item.googleSymbol, r.value);
	}
	return map;
};

// 캐시된 전일 종가와 오늘 조회한 전일 종가를 합쳐 최종값을 정한다.
const resolvePrevClose = (item, freshMap, date) => {
	if (freshMap.has(item.googleSymbol)) {
		return { prevClose: freshMap.get(item.googleSymbol), prevCloseDate: date };
	}
	if (Number.isFinite(item.prevClose) && item.prevCloseDate === date) {
		return { prevClose: item.prevClose, prevCloseDate: item.prevCloseDate };
	}
	// 조회 실패 — 기존 값을 그대로 두면 다음 실행에서 다시 시도한다.
	return { prevClose: item.prevClose, prevCloseDate: item.prevCloseDate };
};

// 전일 종가가 오늘 기준으로 확인된 경우에만 등락률을 갱신한다. 며칠 지난 종가로
// 계산하면 '전일대비'가 아니게 되므로 그때는 기존 rate 를 유지한다.
const calcRate = (price, prevClose, prevCloseDate, date) => {
	if (prevCloseDate !== date) return undefined;
	if (!Number.isFinite(prevClose) || prevClose <= 0) return undefined;
	// KIS 의 prdy_ctrt 가 소수점 둘째 자리까지만 주던 것과 맞춘다. 원시 float 를 그대로
	// 저장하면 화면에 -0.2961766289714593% 처럼 찍힌다.
	return Math.round(((price - prevClose) / prevClose) * 10000) / 100;
};

const _arrangeInvestment = async ({ stockId, marketTz, parsePrice, fetchPrevClose, isRegularSession, label }) => {
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
	const prevCloseMap = await fetchPreviousCloses(investments, stockResponse.data, date, fetchPrevClose);

	await stockDB.insertStock({
		...stockResponse,
		date,
		data: stockResponse.data.map((i) => {
			const quote = priceMap.get(toTossSymbol(i.googleSymbol));
			const price = parsePrice(quote?.lastPrice);

			if (!Number.isFinite(price)) return i;

			// 장외에는 가격이 비어 있던 종목만 채운다. 나머지는 정규장 종가 유지.
			if (!regular && Number.isFinite(i.price)) return i;

			const { prevClose, prevCloseDate } = resolvePrevClose(i, prevCloseMap, date);
			const rate = calcRate(price, prevClose, prevCloseDate, date);

			return {
				...i,
				price,
				rate: rate === undefined ? i.rate : rate,
				prevClose,
				prevCloseDate,
				weeklyPrices: updateWeeklyPrices(i.weeklyPrices, date, price)
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
	marketTz: 'America/Los_Angeles',
	parsePrice: (v) => parseFloat(v),
	fetchPrevClose: getTossPreviousClose,
	label: 'arrangeUSInvestmemt'
});

const arrangeKRInvestmemt = singleFlight('arrangeKRInvestmemt', _arrangeKRInvestmemt);
const arrangeUSInvestmemt = singleFlight('arrangeUSInvestmemt', _arrangeUSInvestmemt);

module.exports = {
	arrangeKRInvestmemt,
	arrangeUSInvestmemt
};
