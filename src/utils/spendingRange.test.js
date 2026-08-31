import { monthsAgoStr, thisMonthStr, getStartMonthStr, isMonthInRange } from './spendingRange';

// 로컬 시각으로 고정한다. 예전 구현은 toISOString() 을 써서 UTC 기준이 됐다.
const at = (y, m, d, hh = 12, mm = 0) => new Date(y, m - 1, d, hh, mm);

describe('monthsAgoStr', () => {
	test('0 이면 그 달', () => {
		expect(monthsAgoStr(0, at(2026, 8, 31))).toBe('2026-08');
	});

	test('해를 넘어가도 맞는다', () => {
		expect(monthsAgoStr(2, at(2026, 1, 15))).toBe('2025-11');
		expect(monthsAgoStr(12, at(2026, 8, 31))).toBe('2025-08');
	});

	// setDate(1) 을 먼저 하지 않으면 1/31 에서 setMonth(0) 이 3월로 튄다.
	test('말일에도 달이 튀지 않는다', () => {
		expect(monthsAgoStr(1, at(2026, 3, 31))).toBe('2026-02');
		expect(monthsAgoStr(1, at(2026, 5, 31))).toBe('2026-04');
		expect(monthsAgoStr(0, at(2026, 1, 31))).toBe('2026-01');
	});

	test('넘긴 시각을 변경하지 않는다', () => {
		const now = at(2026, 8, 31);
		const before = now.getTime();
		monthsAgoStr(3, now);
		expect(now.getTime()).toBe(before);
	});
});

// KST 에서 매월 1일 오전 9시까지 UTC 는 아직 지난달이다. 그 구간에서 This Month 가
// 지난달을 가리켰다.
describe('thisMonthStr', () => {
	test.each([
		['월초 00:30', at(2026, 9, 1, 0, 30), '2026-09'],
		['월초 08:59', at(2026, 9, 1, 8, 59), '2026-09'],
		['말일 23:59', at(2026, 8, 31, 23, 59), '2026-08'],
		['1월 1일 00:00', at(2026, 1, 1, 0, 0), '2026-01']
	])('%s → %s', (_label, now, expected) => {
		expect(thisMonthStr(now)).toBe(expected);
	});
});

describe('getStartMonthStr', () => {
	const now = at(2026, 8, 31);

	test.each([
		['1M', '2026-08'],
		['3M', '2026-06'],
		['6M', '2026-03'],
		['YTD', '2026-01'],
		['1Y', '2025-08']
	])('%s → %s', (range, expected) => {
		expect(getStartMonthStr(range, now)).toBe(expected);
	});

	test('모르는 범위는 null (하한 없음)', () => {
		expect(getStartMonthStr('ALL', now)).toBeNull();
	});
});

describe('isMonthInRange', () => {
	const now = at(2026, 8, 31);

	test('1M 은 이번 달만 받는다', () => {
		expect(isMonthInRange('2026-08', '1M', now)).toBe(true);
		expect(isMonthInRange('2026-07', '1M', now)).toBe(false);
	});

	// 이게 이번 수정의 핵심이다. 카드 결제 예정분처럼 미래 날짜 거래가 있어서,
	// 상한이 없던 동안 '최근 1개월' 에 다음 달 금액이 섞였다.
	test('미래 달은 어떤 범위에서도 제외한다', () => {
		['1M', '3M', '6M', 'YTD', '1Y'].forEach(range => {
			expect(isMonthInRange('2026-09', range, now)).toBe(false);
			expect(isMonthInRange('2026-12', range, now)).toBe(false);
			expect(isMonthInRange('2027-01', range, now)).toBe(false);
		});
	});

	test('하한이 없는 범위에서도 미래는 막는다', () => {
		expect(isMonthInRange('2026-09', 'ALL', now)).toBe(false);
		expect(isMonthInRange('2020-01', 'ALL', now)).toBe(true);
	});

	test('3M 은 이번 달 포함 3개월', () => {
		expect(isMonthInRange('2026-06', '3M', now)).toBe(true);
		expect(isMonthInRange('2026-07', '3M', now)).toBe(true);
		expect(isMonthInRange('2026-08', '3M', now)).toBe(true);
		expect(isMonthInRange('2026-05', '3M', now)).toBe(false);
	});

	test('YTD 는 올해 지난 달만', () => {
		expect(isMonthInRange('2026-01', 'YTD', now)).toBe(true);
		expect(isMonthInRange('2026-08', 'YTD', now)).toBe(true);
		expect(isMonthInRange('2025-12', 'YTD', now)).toBe(false);
		expect(isMonthInRange('2026-09', 'YTD', now)).toBe(false);
	});

	test('빈 값은 false', () => {
		expect(isMonthInRange('', '1M', now)).toBe(false);
		expect(isMonthInRange(undefined, '1M', now)).toBe(false);
	});

	// 실측 재현: 8월 전기요금 93,770 · 9월 10일자 140,110
	test('실제로 섞였던 9월 거래를 걸러낸다', () => {
		expect(isMonthInRange('2026-08-15'.substring(0, 7), '1M', now)).toBe(true);
		expect(isMonthInRange('2026-09-10'.substring(0, 7), '1M', now)).toBe(false);
	});
});
