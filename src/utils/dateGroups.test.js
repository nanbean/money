import { buildDateGroups, formatDayHeader } from './dateGroups';

describe('formatDayHeader', () => {
	const now = new Date(2026, 10, 12);

	test('올해는 월·일·요일만', () => {
		expect(formatDayHeader('2026-11-11', now)).toBe('11월 11일 (수)');
	});

	test('다른 해는 연도를 붙인다', () => {
		expect(formatDayHeader('2025-12-31', now)).toBe('2025년 12월 31일 (수)');
	});

	test('시각이 붙은 날짜도 날짜만 본다', () => {
		expect(formatDayHeader('2026-11-10T23:59:00', now)).toBe('11월 10일 (화)');
	});
});

describe('buildDateGroups', () => {
	const t = (date, amount, currency = 'KRW') => ({ date, amount, currency });
	const cur = (x) => x.currency;

	test('같은 날짜끼리 머리줄 하나로 묶고 원래 index 를 남긴다', () => {
		const items = buildDateGroups([t('2026-11-11', -100), t('2026-11-11', 300), t('2026-11-10', -50)], cur);

		expect(items).toEqual([
			{ type: 'header', date: '2026-11-11', total: 200, currency: 'KRW' },
			{ type: 'row', index: 0 },
			{ type: 'row', index: 1 },
			{ type: 'header', date: '2026-11-10', total: -50, currency: 'KRW' },
			{ type: 'row', index: 2 }
		]);
	});

	test('통화가 섞인 날은 합계를 내지 않는다', () => {
		const items = buildDateGroups([t('2026-11-11', -100), t('2026-11-11', -5, 'USD')], cur);

		expect(items[0]).toMatchObject({ total: null, currency: null });
	});

	test('빈 목록', () => {
		expect(buildDateGroups([], cur)).toEqual([]);
		expect(buildDateGroups(undefined, cur)).toEqual([]);
	});
});
