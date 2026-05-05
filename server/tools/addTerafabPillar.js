// One-shot: append a "Terafab / 자체 반도체" pillar to the TSLA thesis and
// log the 2026-05-03 first review for it. Idempotent on the pillar (skips if
// already present); always appends a review entry.
const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production';
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile) });

const thesisService = require('../services/thesisService');

const ID = 'thesis:TSLA';
const DATE = '2026-05-03';
const newId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const PILLAR = {
	id: 'terafab',
	label: 'Terafab / 자체 반도체',
	description: 'Tesla-SpaceX-xAI-Intel 합작 반도체 fab (Austin GigaTexas, 2nm, $20–25B). 자체 AI 칩 양산 능력 — AI5/AI6/Dojo3 iteration 속도, 외부 파운드리 의존도 감소.'
};

const REVIEW = {
	pillarId: 'terafab',
	score: 'strengthening',
	note: 'Terafab 발표 (2026-03-21, Tesla+SpaceX+xAI 합작) + Intel 합류 (2026-04-07). 부지 GigaTexas, 2nm, 100K wpm 목표, 총 $20–25B. AI5 칩 첫 양산 예정 — engineering samples 2026 후반, HVM 2027 mid. AI 축 thesis의 핵심 enabler. 단 실행 risk(타임라인/수율/CAPX 부담) 잔존.',
	sources: [
		'https://en.wikipedia.org/wiki/Terafab',
		'https://www.fintechweekly.com/news/terafab-launch-tesla-spacex-xai-chip-factory-austin-march-2026',
		'https://electrek.co/2026/04/15/tesla-ai5-chip-taped-out-musk-ai6-dojo3/'
	]
};

(async () => {
	try {
		const existing = await thesisService.get(ID);
		const pillars = (existing.pillars || []).slice();
		const already = pillars.find(p => p.id === PILLAR.id);
		if (already) {
			pillars.splice(pillars.indexOf(already), 1, PILLAR);
			console.log(`[addTerafabPillar] Pillar '${PILLAR.id}' already present — refreshed label/description.`);
		} else {
			pillars.push(PILLAR);
			console.log(`[addTerafabPillar] Added pillar '${PILLAR.id}'.`);
		}

		const review = { id: newId('rv'), date: DATE, ...REVIEW };
		const reviews = [...(existing.reviews || []), review];

		const next = { ...existing, pillars, reviews };
		const saved = await thesisService.upsert(next);
		console.log(`  pillars now: ${saved.pillars.length}`);
		console.log(`  reviews now: ${saved.reviews.length}`);
		console.log(`  · ${review.pillarId.padEnd(20)} ${review.score}  ${review.date}`);
		process.exit(0);
	} catch (err) {
		console.error('[addTerafabPillar] failed:', err);
		process.exit(1);
	}
})();
