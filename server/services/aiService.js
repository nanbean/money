const { GoogleGenerativeAI } = require('@google/generative-ai');
const moment = require('moment-timezone');
const reportDB = require('../db/reportDB');
const transactionDB = require('../db/transactionDB');
const accountDB = require('../db/accountDB');
const stockDB = require('../db/stockDB');
const { getExchangeRate } = require('./settingService');
const { getKisToken, getKisWeeklyPriceUS, getKisWeeklyPriceKorea } = require('./kisConnector');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const getPortfolioComment = async (portfolioData) => {
	const { holdings, totalAppraisedValue, totalReturn, currency, cagrBase, cagr, projections, periodTwr, periodRange } = portfolioData;

	const model = genAI.getGenerativeModel({
		model: 'gemini-2.5-flash',
		systemInstruction: '당신은 투자 포트폴리오 분석 전문가입니다. 간결하고 실용적인 분석을 3-4문장으로 제공합니다. 투자 결정은 본인 판단임을 항상 마지막에 한 문장으로 명시합니다.'
	});

	const holdingsText = holdings.map(h =>
		`- ${h.name}: ${h.displayValue} (비중 ${h.allocation}%, 수익률 ${h.returnRate > 0 ? '+' : ''}${h.returnRate}%)`
	).join('\n');

	let projectionText = '';
	if (cagr && projections) {
		const projText = projections.map(p => `  - ${p.years}년 후: ${p.displayValue}`).join('\n');
		projectionText = `
과거 ${cagrBase}년 CAGR: ${cagr > 0 ? '+' : ''}${cagr}%
이를 기반으로 한 미래 예측:
${projText}`;
	}

	const periodTwrText = periodTwr !== null
		? `\n최근 ${periodRange} 구간 수익률 (TWR, 현금유입 조정): ${periodTwr > 0 ? '+' : ''}${periodTwr}%`
		: '';

	const prompt = `다음은 현재 투자 포트폴리오 현황입니다.

총 평가금액: ${totalAppraisedValue}
전체 수익률: ${totalReturn > 0 ? '+' : ''}${totalReturn}%${periodTwrText}
표시 통화: ${currency}

종목별 현황:
${holdingsText}
${projectionText}

위 현황과 미래 예측을 바탕으로 3-4문장으로 분석 코멘트를 한국어로 작성해주세요. 현재 포트폴리오 특징, CAGR 수준 평가, 장기 전망의 주목할 점을 포함해주세요.`;

	const result = await model.generateContent(prompt);
	return result.response.text().trim();
};

const getWeeklyRecap = async ({ dry = false } = {}) => {
	const todayMoment = moment().tz('Asia/Seoul');
	const dayOfWeek = todayMoment.day(); // 0=Sun, 1=Mon

	// Week range: always covers last Mon ~ last Sun (or Fri for Sat)
	// Saturday: last Monday (5 days ago) ~ today
	// Sunday: last Monday (6 days ago) ~ today
	// Monday: last Monday (7 days ago) ~ yesterday (Sunday)
	const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek === 6 ? 5 : 7;
	const weekStartMoment = todayMoment.clone().subtract(daysToLastMonday, 'days');
	const weekEndMoment = dayOfWeek === 1 ? todayMoment.clone().subtract(1, 'days') : todayMoment;

	const today = weekEndMoment.format('YYYY-MM-DD');
	const weekAgo = weekStartMoment.format('YYYY-MM-DD');

	// Week key: Sat/Sun/Mon-morning 모두 동일한 주 키 사용 (지난 주 기준)
	// Monday는 이미 새 ISO 주 시작이므로 전날(일요일) 기준으로 맞춤
	const cacheReferenceMoment = dayOfWeek === 1
		? todayMoment.clone().subtract(2, 'days')
		: todayMoment;
	const weekKey = cacheReferenceMoment.format('GGGG-WW');
	const recapDoc = await reportDB.getReport('weeklyRecap').catch(() => null);
	// Cache hit only if doc already has the new schema fields (summary). Older docs
	// without `summary` are treated as stale so the AI re-runs and writes the new shape.
	if (recapDoc?.weekKey === weekKey && recapDoc?.comment && recapDoc?.summary) {
		console.log(`weeklyRecap: returning cached result for ${weekKey}`);
		return {
			comment: recapDoc.comment,
			summary: recapDoc.summary,
			spent: recapDoc.spent ?? 0,
			saved: recapDoc.saved ?? 0,
			topCategory: recapDoc.topCategory || null
		};
	}

	const [netWorthDailyDoc, allTransactions, allAccounts, kospiRes, kosdaqRes, usRes, exchangeRate] = await Promise.all([
		reportDB.getReport('netWorthDaily').catch(() => null),
		transactionDB.getAllTransactions(),
		accountDB.listAccounts(),
		stockDB.getStock('kospi').catch(() => ({ data: [] })),
		stockDB.getStock('kosdaq').catch(() => ({ data: [] })),
		stockDB.getStock('us').catch(() => ({ data: [] })),
		getExchangeRate()
	]);

	// Map accountId → currency for USD conversion
	const accountCurrencyMap = new Map(allAccounts.map(a => [a._id, a.currency || 'KRW']));
	const toKRW = (amount, accountId) => {
		const currency = accountCurrencyMap.get(accountId) || 'KRW';
		return currency === 'USD' ? amount * exchangeRate : amount;
	};

	// Net worth daily trend (Mon ~ today)
	const netWorthDailyData = (netWorthDailyDoc?.data || []).filter(d => d.date >= weekAgo);

	// Start baseline: last entry on or before last Sat/Sun (day before this week's Monday)
	const netWorthBaselineDate = weekStartMoment.clone().subtract(1, 'days').format('YYYY-MM-DD');
	const netWorthBaselineEntry = (netWorthDailyDoc?.data || [])
		.filter(d => d.date <= netWorthBaselineDate)
		.sort((a, b) => b.date.localeCompare(a.date))[0] || null;
	const fallbackEntry = netWorthDailyData[0] || null;

	const netWorthStart = (netWorthBaselineEntry || fallbackEntry)?.netWorth ?? 0;
	const netWorthEnd = netWorthDailyData.length > 0 ? netWorthDailyData[netWorthDailyData.length - 1].netWorth : 0;
	const netWorthChange = netWorthEnd - netWorthStart;
	const cashChange = netWorthDailyData.length > 0
		? netWorthDailyData[netWorthDailyData.length - 1].cashNetWorth - ((netWorthBaselineEntry || fallbackEntry)?.cashNetWorth ?? 0) : 0;
	const investmentChange = netWorthDailyData.length > 0
		? netWorthDailyData[netWorthDailyData.length - 1].investmentsNetWorth - ((netWorthBaselineEntry || fallbackEntry)?.investmentsNetWorth ?? 0) : 0;

	// Weekly transactions (exclude investment buy/sell and account transfers)
	const weeklyTransactions = allTransactions
		.filter(t => t.date >= weekAgo && t.date <= today && !t.activity
			&& !(t.category && t.category.startsWith('[') && t.category.endsWith(']')))
		.sort((a, b) => b.date.localeCompare(a.date));

	const incomeTotal = weeklyTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + toKRW(t.amount, t.accountId), 0);
	const expenseTotal = weeklyTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + toKRW(t.amount, t.accountId), 0);

	// Pre-computed metrics for client (Spent / Saved / Top category)
	const spent = Math.abs(expenseTotal);
	const saved = incomeTotal + expenseTotal; // expenseTotal is negative
	const expenseByCategory = weeklyTransactions
		.filter(t => t.amount < 0)
		.reduce((map, t) => {
			const key = (t.category || 'Other').split(':')[0];
			const krw = toKRW(Math.abs(t.amount), t.accountId);
			map.set(key, (map.get(key) || 0) + krw);
			return map;
		}, new Map());
	const topCatEntry = [...expenseByCategory.entries()].sort((a, b) => b[1] - a[1])[0];
	const topCategory = topCatEntry
		? { name: topCatEntry[0], value: Math.round(topCatEntry[1]), pct: spent > 0 ? Math.round(topCatEntry[1] / spent * 100) : 0 }
		: null;

	// Separate investment deposit vs price gain/loss
	// Investment-related accounts: Invst type + _Cash accounts (Bank type, e.g. KB증권_Cash)
	const investmentRelatedIds = new Set(
		allAccounts
			.filter(a => a.type === 'Invst' || (a.name && /_Cash$/i.test(a.name)))
			.map(a => a._id)
	);
	const netInvestmentDeposit = allTransactions
		.filter(t => t.date >= weekAgo && t.date <= today
			&& investmentRelatedIds.has(t.accountId)
			&& t.category && t.category.startsWith('[') && t.category.endsWith(']'))
		.reduce((sum, t) => sum + toKRW(t.amount, t.accountId), 0);
	const investmentGainLoss = investmentChange - netInvestmentDeposit;

	// googleSymbol (e.g. "NASDAQ:TSLA", "KRX:005930") and rate from stockDB
	const allStockData = new Map(
		[...kospiRes.data, ...kosdaqRes.data, ...usRes.data].map(s => [s.name, { rate: s.rate ?? null, googleSymbol: s.googleSymbol || null }])
	);

	const holdingsMap = {};
	for (const account of allAccounts.filter(a => a.type === 'Invst')) {
		for (const inv of (account.investments || [])) {
			if (!holdingsMap[inv.name]) {
				holdingsMap[inv.name] = { name: inv.name, quantity: 0 };
			}
			holdingsMap[inv.name].quantity += inv.quantity;
		}
	}

	// Fetch weekly price per stock via KIS API
	const accessToken = await getKisToken();
	const holdings = await Promise.all(
		Object.values(holdingsMap)
			.filter(h => h.quantity > 0)
			.map(async h => {
				const stockInfo = allStockData.get(h.name);
				const googleSymbol = stockInfo?.googleSymbol;
				let weekStart = null, weekEnd = null, weekHigh = null;

				if (googleSymbol) {
					try {
						const isKR = googleSymbol.startsWith('KRX:') || googleSymbol.startsWith('KOSDAQ:');
						if (isKR) {
							const res = await getKisWeeklyPriceKorea(accessToken, googleSymbol);
							// output2 sorted newest-first: stck_oprc=open, stck_hgpr=high, stck_clpr=close
							const items = (res?.output2 || []).filter(i => i.stck_clpr && i.stck_clpr !== '0');
							if (items.length > 0) {
								weekEnd = parseFloat(items[0].stck_clpr);
								weekStart = parseFloat(items[items.length - 1].stck_oprc);
								weekHigh = Math.max(...items.map(i => parseFloat(i.stck_hgpr)));
							}
						} else {
							const res = await getKisWeeklyPriceUS(accessToken, googleSymbol);
							// output2[0] = current week: open, high, low, clos
							const week = res?.output2?.[0];
							if (week && week.clos) {
								weekStart = parseFloat(week.open);
								weekEnd = parseFloat(week.clos);
								weekHigh = parseFloat(week.high);
							}
						}
					} catch (err) {
						console.error(`weeklyRecap: price fetch failed for ${h.name}:`, err.message);
					}
				}

				return {
					name: h.name,
					quantity: h.quantity,
					todayRate: stockInfo?.rate ?? null,
					weekStart,
					weekEnd,
					weekHigh
				};
			})
	);

	const model = genAI.getGenerativeModel({
		model: 'gemini-2.5-flash',
		systemInstruction: '당신은 개인 자산관리 분석 전문가입니다. 주간 자산 변동을 분석합니다. 응답은 반드시 다음 두 섹션으로 시작합니다:\n\n[SUMMARY]\n20자 내외의 한국어 한 줄 요약 (이번 주를 한 마디로)\n[/SUMMARY]\n\n그 다음 마크다운 형식(## 헤더, **굵게** 등)으로 한국어 상세 분석을 작성합니다. 전체 분석은 2000자 이내.'
	});

	const formatKRW = (v) => {
		const abs = Math.abs(Math.round(v));
		if (abs >= 1e8) return `${(v / 1e8).toFixed(2)}억원`;
		if (abs >= 1e4) return `${Math.round(v / 1e4)}만원`;
		return `${Math.round(v).toLocaleString()}원`;
	};
	const sign = (v) => v >= 0 ? '+' : '';

	const trendText = netWorthDailyData.map(d => `  ${d.date}: ${formatKRW(d.netWorth)}`).join('\n');

	const txText = weeklyTransactions.slice(0, 10)
		.map(t => {
			const amountKRW = toKRW(t.amount, t.accountId);
			return `  ${t.date} ${t.payee || ''}: ${sign(amountKRW)}${formatKRW(amountKRW)}`;
		}).join('\n');

	const holdingsText = holdings.map(h => {
		const parts = [`${h.name}: ${h.quantity}주`];
		if (h.weekStart !== null) parts.push(`주초 ${h.weekStart}`);
		if (h.weekEnd !== null) parts.push(`주말 ${h.weekEnd}`);
		if (h.weekHigh !== null) parts.push(`주중최고 ${h.weekHigh}`);
		if (h.weekStart && h.weekEnd) {
			const weekRate = ((h.weekEnd - h.weekStart) / h.weekStart * 100).toFixed(2);
			parts.push(`주간 ${sign(parseFloat(weekRate))}${weekRate}%`);
		}
		return `  ${parts.join(' | ')}`;
	}).join('\n');

	const pctChange = netWorthStart !== 0
		? `${sign(netWorthChange)}${(netWorthChange / Math.abs(netWorthStart) * 100).toFixed(2)}%` : 'N/A';

	const prompt = `다음은 ${weekAgo} ~ ${today} 주간 자산 현황입니다. (순자산 비교 기준: ${netWorthBaselineDate} 종가)

순자산: ${formatKRW(netWorthStart)} → ${formatKRW(netWorthEnd)} (${sign(netWorthChange)}${formatKRW(netWorthChange)}, ${pctChange})
현금성 변동: ${sign(cashChange)}${formatKRW(cashChange)}
투자 변동: ${sign(investmentChange)}${formatKRW(investmentChange)} (입금 ${sign(netInvestmentDeposit)}${formatKRW(netInvestmentDeposit)}, 손익 ${sign(investmentGainLoss)}${formatKRW(investmentGainLoss)})
수입 합계: +${formatKRW(incomeTotal)}
지출 합계: ${formatKRW(expenseTotal)}
환율: ${Math.round(exchangeRate)}원/달러

일별 순자산 추이:
${trendText || '  (데이터 없음)'}

보유 투자 종목 (수량 | 주초가 | 주말가 | 주중최고가 | 주간등락률):
${holdingsText || '  (보유 종목 없음)'}

주요 거래 내역:
${txText || '  (거래 없음)'}

위 데이터를 바탕으로 응답을 작성해주세요. 형식:

[SUMMARY]
(20자 내외 한 줄 요약)
[/SUMMARY]

## 분석
1. 순자산 변동 요약 및 주요 원인
2. 투자 포트폴리오 분석 (총수익률, 당일 등락 종목 현황, 주간 투자자산 변동 평가)
3. 주요 수입/지출 패턴
4. 짧은 총평`;

	if (dry) return prompt;

	const result = await model.generateContent(prompt);
	const raw = result.response.text().trim();

	// Parse [SUMMARY]...[/SUMMARY] block
	const summaryMatch = raw.match(/\[SUMMARY\]\s*([\s\S]*?)\s*\[\/SUMMARY\]/i);
	const summary = summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ').slice(0, 40) : '';
	const comment = summaryMatch
		? raw.replace(/\[SUMMARY\][\s\S]*?\[\/SUMMARY\]/i, '').trim()
		: raw;

	// Save to single weeklyRecap doc (이번 주 데이터만 유지, 개발 환경에서는 저장 생략)
	if (process.env.NODE_ENV !== 'development') {
		const doc = {
			_id: 'weeklyRecap',
			weekKey,
			comment,
			summary,
			spent: Math.round(spent),
			saved: Math.round(saved),
			topCategory,
			createdAt: new Date()
		};
		if (recapDoc?._rev) doc._rev = recapDoc._rev;
		await reportDB.insertReport(doc).catch(err => console.error('weeklyRecap cache save error:', err));
	}

	return {
		comment,
		summary,
		spent: Math.round(spent),
		saved: Math.round(saved),
		topCategory
	};
};

module.exports = { getPortfolioComment, getWeeklyRecap };
