// Seed the initial TSLA thesis doc with 6 pillars (Unsupervised FSD as a
// dedicated pillar per the user's emphasis). Run once after deploying the
// thesis feature; safe to re-run (upsert keeps the latest pillar list,
// retains existing reviews if the doc already exists).
//
// Usage:
//   NODE_ENV=production node server/tools/seedTslaThesis.js
const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production';
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile) });

const thesisService = require('../services/thesisService');

const PILLARS = [
	{
		id: 'unsupervised-fsd',
		label: 'Unsupervised FSD 진척',
		description: '운전자 감독 없이 자율주행이 작동하는 마일스톤. V14+ 진화, 무감독 마일리지/안전성 통계, 규제 승인 (NHTSA/CA DMV/EU UNECE), 지오펜스 확대.'
	},
	{
		id: 'robotaxi',
		label: 'Robotaxi 상용화',
		description: 'Cybercab 양산·매출 기여, robotaxi 서비스 지역 확장(US/EU/KR), 단가·이용률, 운영 마진.'
	},
	{
		id: 'auto-margin',
		label: '자동차 마진 회복',
		description: 'Automotive gross margin (ex-credits), ASP, 가격 전략, 신모델(Roadster/Cybertruck/저가 모델)의 단위 경제성.'
	},
	{
		id: 'energy',
		label: 'Energy storage 매출 성장',
		description: 'Megapack 백로그·매출·마진, Lathrop/Shanghai 가동률, 전력망/AI 데이터센터 수요.'
	},
	{
		id: 'optimus',
		label: 'Optimus 진척',
		description: '양산 마일스톤, 단가/BOM, 내부 활용, 외부 출하, 노동 대체 ROI 시그널.'
	},
	{
		id: 'finance',
		label: '재무 건전성',
		description: '현금/유동성, FCF, 부채, capex 페이스, 신주 발행 압력, 현금 비축률 vs 투자 사이클.'
	},
	{
		id: 'terafab',
		label: 'Terafab / 자체 반도체',
		description: 'Tesla-SpaceX-xAI-Intel 합작 반도체 fab (Austin GigaTexas, 2nm, $20–25B). 자체 AI 칩 양산 능력 — AI5/AI6/Dojo3 iteration 속도, 외부 파운드리 의존도 감소.'
	}
];

const ID = 'thesis:TSLA';

(async () => {
	try {
		let existing = null;
		try {
			existing = await thesisService.get(ID);
		} catch (err) {
			if (err.statusCode !== 404) throw err;
		}

		const doc = {
			_id: ID,
			_rev: existing?._rev,
			ticker: 'TSLA',
			title: 'Tesla long thesis',
			pillars: PILLARS,
			reviewIntervalDays: 90,
			reviews: existing?.reviews || [],
			createdAt: existing?.createdAt
		};

		const saved = await thesisService.upsert(doc);
		console.log(`[seedTslaThesis] ${existing ? 'Updated' : 'Created'} ${saved._id}`);
		console.log(`  pillars: ${saved.pillars.length}`);
		console.log(`  reviews: ${saved.reviews.length}`);
		console.log(`  reviewIntervalDays: ${saved.reviewIntervalDays}`);
		process.exit(0);
	} catch (err) {
		console.error('[seedTslaThesis] failed:', err);
		process.exit(1);
	}
})();
