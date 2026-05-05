// One-shot: append the 2026-05-03 first-quarter review (6 entries, one per
// pillar) to the existing TSLA thesis doc. Idempotency note — running twice
// will duplicate. Designed to be run once after seedTslaThesis.
const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production';
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile) });

const thesisService = require('../services/thesisService');

const ID = 'thesis:TSLA';
const DATE = '2026-05-03';
const newId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const REVIEWS = [
	{
		pillarId: 'unsupervised-fsd',
		score: 'strengthening',
		note: 'V14.3.2 광범위 rollout, 9B 마일 돌파(+1B/월). EU 무감독 pilot London/Berlin 승인이 Q1 가장 큰 마일스톤. Q4 2026 미국 무감독 commercial 가이던스는 여전히 검증 대상.',
		sources: [
			'https://www.basenor.com/blogs/news/tesla-fsd-hits-9-billion-miles-what-the-data-really-means',
			'https://markets.financialcontent.com/stocks/article/marketminute-2026-4-8-teslas-autonomy-leap-unsupervised-fsd-pilots-authorized-for-london-and-berlin',
			'https://www.teslaoracle.com/2026/04/27/tesla-rolls-out-fsd-v14-3-2-2026-2-9-8-first-impressions-release-notes-rollout-status/'
		]
	},
	{
		pillarId: 'robotaxi',
		score: 'strengthening',
		note: 'Cybercab production 시작 + Dallas/Houston 무감독 서비스 launch (Austin 포함 3개 도시 ~573대). H1 2026 +7도시 가이드. 단가/수익성 공시는 아직 부재 — 다음 분기 점검 필요.',
		sources: [
			'https://autonoumnews.com/2026/04/tesla-starts-cybercab-production/',
			'https://tech-insider.org/tesla-robotaxi-dallas-houston-unsupervised-launch-2026/'
		]
	},
	{
		pillarId: 'auto-margin',
		score: 'weakening',
		note: 'Headline GM 21.1% / excl-credits 19.2%지만 일회성 워런티 reversal $230M + 관세 relief가 핵심 동인. regulatory credits 비중 1.9%로 축소. 인도 358K는 컨센 미달. 마진 회복 신호 약함 — 정상화 시 17~18%대로 회귀 가능성.',
		sources: [
			'https://electrek.co/2026/04/22/tesla-tsla-q1-2026-one-time-benefits-warranty-tariff-refunds-margins/',
			'https://www.cnbc.com/2026/04/22/tesla-tsla-q1-2026-earnings-report.html'
		]
	},
	{
		pillarId: 'energy',
		score: 'weakening',
		note: 'Q1 deployment 8.8 GWh (-38% QoQ), 매출 $2.41B (-12% YoY). 가격 정상화 + 관세가 마진 압박. 백로그 $29B+ 유지, Megapack 3/Megablock 2H 2026 양산. 약화는 단기적 — 하반기 회복 여부 다음 점검.',
		sources: [
			'https://www.teslaacessories.com/blogs/news/tesla-energy-q1-2026-update-megapack-deployments-surge-to-record-highs-as-utility-scale-storage-transforms-the-grid'
		]
	},
	{
		pillarId: 'optimus',
		score: 'on-track',
		note: 'Optimus V3 mid-2026 debut, 양산 Q3 2026 (Jul-Aug). Fremont의 Model S/X 라인 → Optimus 라인 전환은 큰 capex commitment (1M/yr 설계). 외부 출하는 2027로 소폭 슬립. 다음 점검: V3 실제 출시 + 외부 사용 사례.',
		sources: [
			'https://www.tradingkey.com/analysis/stocks/us-stocks/261814739-tesla-third-generation-humanoid-robot-debut-mid-year-tradingkey',
			'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/'
		]
	},
	{
		pillarId: 'finance',
		score: 'weakening',
		note: '현금 $44.7B 견조하나 향후 3분기 FCF 음전환 가이드. 2026 capex $25B+ (+$5B 상향). Q1 차주 +$0.8B (net). AI/Optimus/Cybercab 투자는 thesis와 정합하지만 ROI 검증 전 단계 — 현금 소진 페이스가 앞으로 가장 중요한 watch item.',
		sources: [
			'https://fortune.com/2026/04/23/tesla-stock-price-earnings-call-outlook/',
			'https://www.heygotrade.com/en/blog/tesla-q1-2026-earnings-recap/'
		]
	}
];

(async () => {
	try {
		const existing = await thesisService.get(ID);
		const newReviews = REVIEWS.map(r => ({
			id: newId('rv'),
			date: DATE,
			...r
		}));
		const next = {
			...existing,
			reviews: [...(existing.reviews || []), ...newReviews]
		};
		const saved = await thesisService.upsert(next);
		console.log(`[addInitialTslaReviews] Added ${newReviews.length} reviews on ${DATE}.`);
		console.log(`  Total reviews now: ${saved.reviews.length}`);
		newReviews.forEach(r => console.log(`  · ${r.pillarId.padEnd(20)} ${r.score}`));
		process.exit(0);
	} catch (err) {
		console.error('[addInitialTslaReviews] failed:', err);
		process.exit(1);
	}
})();
