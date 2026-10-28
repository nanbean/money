const notificationDB = require('../db/notificationDB');
const messaging = require('./messaging');
const stockDB = require('../db/stockDB');
const { getAllAccounts } = require('./accountService');
const { getExchangeRate, getCurrency } = require('./settingService');
const { isInvestmentCash } = require('../utils/account');
const { getInvestmentsFromAccounts } = require('../utils/investment');

// 장 마감 알림에 붙일 종목 수.
const TOP_HOLDINGS_COUNT = 2;

// 시장별 시세 문서와 표시 통화. 종가는 그 시장 통화로 보여 준다 —
// 표시 통화로 환산하면 '종가'가 아니게 된다.
const MARKETS = {
	KR: { stockIds: ['kospi', 'kosdaq'], currency: 'KRW', locale: 'ko-KR' },
	US: { stockIds: ['us'], currency: 'USD', locale: 'en-US' }
};

const addNotification = async (notification) => {
	await notificationDB.addNotification(notification);
};

// Settings > Notification 화면용. 최신순 그대로 돌려준다.
//
// 예전에는 title·text 만 남기고 순서를 뒤집었다. 그래서 화면이 쓰는 _id(날짜 묶음)·
// packageName·transaction(기록된 거래)이 빠져 모든 알림이 '날짜 미상'으로 묶이고
// 상단 '최근 3건'이 가장 오래된 3건을 보여 줬다.
const listNotifications = async (size) => {
	const notifications = await notificationDB.listNotifications(size);
	return notifications.map(i => ({
		_id: i._id,
		packageName: i.packageName || '',
		title: i.title || '',
		text: i.text || '',
		transaction: i.transaction || null
	}));
};

// 그 시장 보유 종목을 평가금액(종가 × 수량) 순으로 줄 세워 위에서 자른다.
// 계좌 문서의 price 가 아니라 시세 문서를 본다 — 마감 크론이 방금 갱신한 쪽이다.
const getTopHoldings = async (allAccounts, market) => {
	const { stockIds } = MARKETS[market];
	const docs = await Promise.all(stockIds.map(id => stockDB.getStock(id).catch(() => ({ data: [] }))));
	const stocks = docs.flatMap(doc => doc.data || []);

	const investAccounts = allAccounts.filter(account => account.type === 'Invst' && Array.isArray(account.investments));
	return getInvestmentsFromAccounts(stocks, investAccounts)
		.filter(holding => holding.quantity > 0)
		.map(holding => {
			const stock = stocks.find(s => s.name === holding.name);
			return { name: holding.name, price: stock?.price, rate: stock?.rate, value: (stock?.price || 0) * holding.quantity };
		})
		.filter(holding => Number.isFinite(holding.price))
		.sort((a, b) => b.value - a.value)
		.slice(0, TOP_HOLDINGS_COUNT);
};

const formatHolding = ({ name, price, rate }, market) => {
	const { currency, locale } = MARKETS[market];
	const priceText = price.toLocaleString(locale, { style: 'currency', currency });
	if (!Number.isFinite(rate)) return `${name} ${priceText}`;
	const sign = rate > 0 ? '+' : '';
	return `${name} ${priceText} (${sign}${rate.toFixed(2)}%)`;
};

// market 은 'KR' 또는 'US'. 어느 장이 끝났는지에 따라 그 시장 상위 종목을 붙인다.
const sendBalanceUpdateNotification = async (market) => {
	const allAccounts = await getAllAccounts();
	const exchangeRate = await getExchangeRate();
	const displayCurrency = await getCurrency();
	const balance = allAccounts
		.filter(account => account?.name && !isInvestmentCash(account))
		.reduce((sum, account) => {
			const accountBalance = account.balance || 0;
			const accountCurrency = account.currency || 'KRW';

			if (accountCurrency === displayCurrency) {
				return sum + accountBalance;
			} else if (displayCurrency === 'KRW' && accountCurrency === 'USD') {
				return sum + (accountBalance * exchangeRate);
			} else if (displayCurrency === 'USD' && accountCurrency === 'KRW') {
				return sum + (accountBalance / exchangeRate);
			}
			return sum;
		}, 0);
	const netWorth = Math.round(balance).toLocaleString(displayCurrency === 'KRW' ? 'ko-KR' : 'en-US', { style: 'currency', currency: displayCurrency });

	const lines = [`Today's NetWorth is ${netWorth}`];
	if (MARKETS[market]) {
		// 종목 줄은 덤이다. 시세 문서를 못 읽어도 자산 알림은 나가야 한다.
		try {
			const topHoldings = await getTopHoldings(allAccounts, market);
			lines.push(...topHoldings.map(holding => formatHolding(holding, market)));
		} catch (err) {
			console.error('sendBalanceUpdateNotification: top holdings failed:', err?.stack || err?.message || err);
		}
	}

	messaging.sendNotification('NetWorth Update', lines.join('\n'), 'graph');
};

module.exports = {
	addNotification,
	listNotifications,
	sendBalanceUpdateNotification
};