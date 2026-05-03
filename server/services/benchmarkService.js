// SPY (S&P 500 tracking ETF) timeseries store. Used by Investments hero
// chart as a "Compare: SPY" benchmark line.
//
// Storage: a single doc in historiesDB at `benchmark:SPY`, shape
//   { _id, _rev, data: [{ date: 'YYYY-MM-DD', close: number }, ...], lastUpdated }
//
// Backfill walks BYMD pages (~100 trading days each) until reaching the
// configured horizon. Incremental update fetches only the most recent page
// and merges new closes past the latest stored date.
const moment = require('moment-timezone');
const { getKisToken, getKisDailyPriceUSWithDate } = require('./kisConnector');
const historyDB = require('../db/historyDB');

const SPY_SYMBOL = 'NYSEARCA:SPY';
const BENCHMARK_DOC_ID = 'benchmark:SPY';
const DEFAULT_BACKFILL_YEARS = 5;
// Hard guard against runaway pagination — ~100 trading days/page so 200
// pages ≈ 80 years, well past SPY's 1993 inception. Backfill stops earlier
// when the requested horizon is reached or KIS returns an empty page.
const MAX_PAGES = 200;

const parseRow = (row) => {
	if (!row || !row.xymd || row.clos === undefined || row.clos === null) return null;
	const xymd = String(row.xymd);
	if (xymd.length !== 8) return null;
	const date = `${xymd.slice(0, 4)}-${xymd.slice(4, 6)}-${xymd.slice(6, 8)}`;
	const close = Number(row.clos);
	if (!Number.isFinite(close) || close <= 0) return null;
	return { date, close };
};

const fetchPage = async (token, bymd) => {
	const res = await getKisDailyPriceUSWithDate(token, SPY_SYMBOL, bymd);
	const rows = (res && res.output2) || [];
	return rows.map(parseRow).filter(Boolean);
};

const loadDoc = async () => {
	const doc = await historyDB.getDoc(BENCHMARK_DOC_ID);
	return doc || { _id: BENCHMARK_DOC_ID, data: [] };
};

const mergeSorted = (existing, incoming) => {
	const map = new Map();
	(existing || []).forEach(e => map.set(e.date, e.close));
	incoming.forEach(e => map.set(e.date, e.close));
	return Array.from(map.entries())
		.map(([date, close]) => ({ date, close }))
		.sort((a, b) => a.date.localeCompare(b.date));
};

const saveDoc = async (doc, mergedData) => {
	const newDoc = {
		...doc,
		data: mergedData,
		lastUpdated: new Date().toISOString()
	};
	const result = await historyDB.putDoc(newDoc);
	return { ...newDoc, _rev: result.rev };
};

const backfillSp500 = async (years = DEFAULT_BACKFILL_YEARS) => {
	const token = await getKisToken();
	const earliest = moment().tz('America/New_York').subtract(years, 'years').format('YYYY-MM-DD');

	let collected = [];
	let bymd = '';
	for (let page = 0; page < MAX_PAGES; page++) {
		const entries = await fetchPage(token, bymd);
		if (entries.length === 0) break;
		collected = collected.concat(entries);
		const oldest = entries.reduce((min, e) => (e.date < min ? e.date : min), entries[0].date);
		if (oldest <= earliest) break;
		// Anchor next page one day before the current oldest.
		bymd = moment(oldest).subtract(1, 'day').format('YYYYMMDD');
	}

	const trimmed = collected.filter(e => e.date >= earliest);
	const doc = await loadDoc();
	const merged = mergeSorted(doc.data, trimmed);
	const saved = await saveDoc(doc, merged);
	return { count: saved.data.length, oldest: saved.data[0]?.date, newest: saved.data[saved.data.length - 1]?.date };
};

const updateSp500 = async () => {
	const doc = await loadDoc();
	const lastDate = doc.data && doc.data.length ? doc.data[doc.data.length - 1].date : null;

	if (!lastDate) {
		return await backfillSp500();
	}

	const token = await getKisToken();
	const entries = await fetchPage(token, '');
	const fresh = entries.filter(e => e.date > lastDate);
	if (fresh.length === 0) {
		return { count: doc.data.length, oldest: doc.data[0]?.date, newest: lastDate, added: 0 };
	}
	const merged = mergeSorted(doc.data, fresh);
	const saved = await saveDoc(doc, merged);
	return { count: saved.data.length, oldest: saved.data[0]?.date, newest: saved.data[saved.data.length - 1]?.date, added: fresh.length };
};

// ─────────────────────────────────────────────────────────────────────────────
// Yahoo Finance fallback fetcher.
//
// KIS's overseas daily-price endpoint only goes back to 2007-08-21 for SPY,
// so for users whose portfolio predates that we backfill the gap from Yahoo's
// public chart endpoint. KIS remains the source-of-truth going forward (the
// daily scheduler trusts it); Yahoo only fills dates the doc doesn't have.
// ─────────────────────────────────────────────────────────────────────────────

// Lazy-instantiate yahoo-finance2 — the lib handles cookie/crumb negotiation,
// retries, and endpoint failover internally, which raw fetch can't reliably
// match (Yahoo aggressively rate-limits unfamiliar UAs).
let _yahooClient = null;
const getYahooClient = () => {
	if (!_yahooClient) {
		const YahooFinance = require('yahoo-finance2').default;
		_yahooClient = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });
	}
	return _yahooClient;
};

const fetchYahooSpyHistory = async (fromDate, toDate) => {
	const yahoo = getYahooClient();
	const result = await yahoo.chart('SPY', {
		period1: fromDate,
		period2: toDate,
		interval: '1d'
	});
	const quotes = (result && result.quotes) || [];
	const entries = [];
	for (const q of quotes) {
		if (!q || !Number.isFinite(q.close) || q.close <= 0) continue;
		const dateStr = q.date instanceof Date
			? moment(q.date).tz('America/New_York').format('YYYY-MM-DD')
			: String(q.date).slice(0, 10);
		if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
		entries.push({ date: dateStr, close: q.close });
	}
	return entries;
};

// Stooq CSV fallback — used when Yahoo rate-limits us (429). Stooq exposes a
// keyless CSV download for SPY history back to 1993; format is
//   Date,Open,High,Low,Close,Volume
const fetchStooqSpyHistory = async (fromDate, toDate) => {
	const d1 = fromDate.replace(/-/g, '');
	const d2 = toDate.replace(/-/g, '');
	const url = `https://stooq.com/q/d/l/?s=spy.us&d1=${d1}&d2=${d2}&i=d`;
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
			Accept: 'text/csv,*/*'
		}
	});
	if (!response.ok) {
		throw new Error(`Stooq fetch failed: HTTP ${response.status}`);
	}
	const csv = await response.text();
	if (!csv || /no data/i.test(csv) || csv.length < 50) {
		throw new Error('Stooq returned no data');
	}
	const lines = csv.trim().split(/\r?\n/);
	if (lines.length < 2) {
		throw new Error('Stooq csv too short');
	}
	const entries = [];
	for (let i = 1; i < lines.length; i++) {
		const cols = lines[i].split(',');
		if (cols.length < 5) continue;
		const date = cols[0];
		const close = Number(cols[4]);
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(close) || close <= 0) continue;
		entries.push({ date, close });
	}
	return entries;
};

// Fill SPY history from external sources for dates the doc doesn't already
// cover. Tries Yahoo first; falls back to Stooq when Yahoo rate-limits or
// rejects the call. KIS-sourced dates win on collision, so this is purely
// additive over the existing series.
const backfillSp500FromYahoo = async (fromDate) => {
	const toDate = moment().tz('America/New_York').format('YYYY-MM-DD');
	let entries = [];
	let source = 'yahoo';
	try {
		entries = await fetchYahooSpyHistory(fromDate, toDate);
	} catch (err) {
		console.warn(`[benchmarkService] Yahoo failed (${err.message}); falling back to Stooq.`); // eslint-disable-line no-console
		entries = await fetchStooqSpyHistory(fromDate, toDate);
		source = 'stooq';
	}

	const doc = await loadDoc();
	const existing = new Set((doc.data || []).map(e => e.date));
	const toAdd = entries.filter(e => !existing.has(e.date) && e.date >= fromDate);
	if (toAdd.length === 0) {
		return { count: doc.data?.length || 0, oldest: doc.data?.[0]?.date, newest: doc.data?.[doc.data.length - 1]?.date, added: 0, source };
	}
	const merged = mergeSorted(doc.data, toAdd);
	const saved = await saveDoc(doc, merged);
	return { count: saved.data.length, oldest: saved.data[0]?.date, newest: saved.data[saved.data.length - 1]?.date, added: toAdd.length, source };
};

const getSp500History = async () => {
	const doc = await loadDoc();
	return doc.data || [];
};

module.exports = {
	backfillSp500,
	backfillSp500FromYahoo,
	updateSp500,
	getSp500History
};
