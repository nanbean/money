import { receivedAtFromId, summarizeReceipts, STALE_MS } from './receiptSummary';

// uuid v1 을 특정 시각으로 만든다 (100ns 단위, 1582-10-15 기준).
const uuidAt = (ms) => {
	const ticks = (ms + 12219292800000) * 10000;
	const hex = ticks.toString(16).padStart(15, '0');
	const hi = hex.slice(0, 3);
	const mid = hex.slice(3, 7);
	const low = hex.slice(7, 15);
	return `${low}-${mid}-1${hi}-8000-000000000000`;
};
const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 28, 6, 0, 0);
const note = (hoursAgo, pkg = 'ios.KBPay', txDate = '2026-10-27') => ({ _id: `${txDate}:${uuidAt(NOW - hoursAgo * HOUR)}`, packageName: pkg });

describe('receivedAtFromId', () => {
	test('uuid v1 에서 저장 시각을 꺼낸다 (거래일 접두어와 무관)', () => {
		const ms = Date.UTC(2026, 9, 13, 2, 41, 55);
		expect(Math.abs(receivedAtFromId(`2026-10-12:${uuidAt(ms)}`) - ms)).toBeLessThan(2);
	});

	test('uuid 가 아니면 null', () => {
		expect(receivedAtFromId('2026-10-12:abc')).toBeNull();
		expect(receivedAtFromId(undefined)).toBeNull();
	});
});

describe('summarizeReceipts', () => {
	test('마지막 수신과 7일 건수, 앱별 건수', () => {
		const list = [note(3), note(10, 'ios.Amex'), note(30), note(24 * 9)];
		const s = summarizeReceipts(list, 20, NOW);
		expect(Math.round(s.sinceLastMs / HOUR)).toBe(3);
		expect(s.stale).toBe(false);
		expect(s.recentCount).toBe(3);
		expect(s.recentPartial).toBe(false);
		expect(s.sources).toEqual([['KBPay', 2], ['Amex', 1]]);
	});

	test('이틀 넘게 비면 stale', () => {
		const s = summarizeReceipts([note(STALE_MS / HOUR + 1)], 20, NOW);
		expect(s.stale).toBe(true);
	});

	test('불러온 목록이 7일 전까지 안 닿고 더 있을 수 있으면 하한 표시', () => {
		const list = Array.from({ length: 20 }, (_, i) => note(i + 1));
		const s = summarizeReceipts(list, 20, NOW);
		expect(s.recentCount).toBe(20);
		expect(s.recentPartial).toBe(true);
	});

	test('알림이 없으면 stale, 마지막 수신 없음', () => {
		const s = summarizeReceipts([], 20, NOW);
		expect(s.lastReceivedAt).toBeNull();
		expect(s.stale).toBe(true);
	});
});
