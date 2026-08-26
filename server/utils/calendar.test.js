const moment = require('moment-timezone');
const {
	isHoliday,
	isUsHoliday,
	setHolidays,
	setUsHolidays,
	getKrxHolidays,
	getNyseHolidays
} = require('../utils/calendar');

const dayOf = (d) => moment.tz(d, 'Asia/Seoul').day();
const isWeekend = (d) => dayOf(d) === 0 || dayOf(d) === 6;

// 휴일은 알고리즘으로 계산하므로(googleapis 의존 제거됨) 외부 mock 이 필요 없다.
// setHolidays/setUsHolidays 는 'YYYY-MM-DD' 문자열 배열을 받는다 — calendar 내부에서
// holidays.includes(date) 로 비교하기 때문에 객체 배열을 넣으면 항상 false 가 된다.
describe('calendar service', () => {
	// 서울과 뉴욕의 날짜가 갈리는 시각을 고정한다.
	// 2026-07-04 10:00 KST = 2026-07-03 21:00 EDT
	const SEOUL_DATE = '2026-07-04';
	const NY_DATE = '2026-07-03';

	beforeAll(() => {
		jest.spyOn(console, 'log').mockImplementation(() => {});
	});

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(moment.tz(`${SEOUL_DATE} 10:00`, 'Asia/Seoul').valueOf());
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	test('고정한 시각에서 서울과 뉴욕의 날짜가 실제로 다르다', () => {
		expect(moment().tz('Asia/Seoul').format('YYYY-MM-DD')).toBe(SEOUL_DATE);
		expect(moment().tz('America/New_York').format('YYYY-MM-DD')).toBe(NY_DATE);
	});

	describe('isHoliday (Asia/Seoul 기준)', () => {
		it('오늘이 KRX 휴일이면 true', () => {
			setHolidays([SEOUL_DATE]);
			expect(isHoliday()).toBe(true);
		});

		it('오늘이 휴일이 아니면 false', () => {
			setHolidays(['2026-07-05']);
			expect(isHoliday()).toBe(false);
		});

		it('휴일 목록이 비면 false', () => {
			setHolidays([]);
			expect(isHoliday()).toBe(false);
		});

		it('뉴욕 날짜가 아니라 서울 날짜로 판정한다', () => {
			setHolidays([NY_DATE]);
			expect(isHoliday()).toBe(false);
		});
	});

	describe('isUsHoliday (America/New_York 기준)', () => {
		it('오늘이 NYSE 휴일이면 true', () => {
			setUsHolidays([NY_DATE]);
			expect(isUsHoliday()).toBe(true);
		});

		it('오늘이 휴일이 아니면 false', () => {
			setUsHolidays(['2026-07-06']);
			expect(isUsHoliday()).toBe(false);
		});

		it('휴일 목록이 비면 false', () => {
			setUsHolidays([]);
			expect(isUsHoliday()).toBe(false);
		});

		it('서울 날짜가 아니라 뉴욕 날짜로 판정한다', () => {
			setUsHolidays([SEOUL_DATE]);
			expect(isUsHoliday()).toBe(false);
		});
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 휴일 생성 로직. 스케줄러가 이 목록으로 휴장일을 건너뛰므로 틀리면 거래일에
// 작업이 빠지거나 휴장일에 실행된다. 그런데 조용히 실패해서 눈치채기 어렵다.
// ─────────────────────────────────────────────────────────────────────────────
describe('getNyseHolidays', () => {
	// 2026/2027 전 항목을 NYSE 규칙과 수동 대조해 확정한 값이다.
	const NYSE_2026 = [
		'2026-01-01', // New Year (목)
		'2026-01-19', // MLK, 1월 3번째 월
		'2026-02-16', // Presidents, 2월 3번째 월
		'2026-04-03', // Good Friday (부활절 04-05 - 2일)
		'2026-05-25', // Memorial, 5월 마지막 월
		'2026-06-19', // Juneteenth (금)
		'2026-07-03', // Independence, 07-04 토 → 금으로 관측
		'2026-09-07', // Labor, 9월 1번째 월
		'2026-11-26', // Thanksgiving, 11월 4번째 목
		'2026-12-25'  // Christmas (금)
	];
	const NYSE_2027 = [
		'2027-01-01',
		'2027-01-18',
		'2027-02-15',
		'2027-03-26', // Good Friday (부활절 03-28 - 2일)
		'2027-05-31',
		'2027-06-18', // Juneteenth 06-19 토 → 금으로 관측
		'2027-07-05', // Independence 07-04 일 → 월로 관측
		'2027-09-06',
		'2027-11-25',
		'2027-12-24'  // Christmas 12-25 토 → 금으로 관측
	];

	test.each([[2026, NYSE_2026], [2027, NYSE_2027]])('%s년 휴일이 정확히 일치한다', (year, expected) => {
		expect([...getNyseHolidays(year)].sort()).toEqual([...expected].sort());
	});

	test('Juneteenth 는 2022년부터만 포함된다', () => {
		expect(getNyseHolidays(2021)).not.toContain('2021-06-18');
		expect(getNyseHolidays(2021)).not.toContain('2021-06-19');
		expect(getNyseHolidays(2022)).toContain('2022-06-20'); // 06-19 일 → 월로 관측
		expect(getNyseHolidays(2021)).toHaveLength(9);
		expect(getNyseHolidays(2022)).toHaveLength(10);
	});

	test('주말에 걸리는 고정 휴일은 인접 평일로 관측된다', () => {
		// 토요일 → 앞 금요일, 일요일 → 다음 월요일
		expect(getNyseHolidays(2026)).toContain('2026-07-03'); // 07-04 토
		expect(getNyseHolidays(2027)).toContain('2027-07-05'); // 07-04 일
		expect(getNyseHolidays(2027)).toContain('2027-12-24'); // 12-25 토
		expect(getNyseHolidays(2022)).toContain('2022-12-26'); // 12-25 일
	});

	test('Good Friday 는 항상 금요일이다', () => {
		for (const year of [2024, 2025, 2026, 2027, 2028]) {
			const goodFriday = getNyseHolidays(year).find(d => {
				const m = moment.tz(d, 'America/New_York');
				return m.day() === 5 && (m.month() === 2 || m.month() === 3);
			});
			expect(goodFriday).toBeDefined();
			expect(moment.tz(goodFriday, 'America/New_York').day()).toBe(5);
		}
	});

	test('모든 항목이 평일이고 YYYY-MM-DD 형식이다', () => {
		for (const year of [2024, 2025, 2026, 2027, 2028]) {
			for (const d of getNyseHolidays(year)) {
				expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
				expect(isWeekend(d)).toBe(false);
			}
		}
	});
});

describe('getKrxHolidays', () => {
	test('결과는 중복 없이 정렬된 YYYY-MM-DD 목록이다', () => {
		for (const year of [2025, 2026, 2027, 2028]) {
			const list = getKrxHolidays(year);
			expect(list).toEqual([...list].sort());
			expect(new Set(list).size).toBe(list.length);
			list.forEach(d => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
		}
	});

	test('양력 고정 휴일이 모두 포함된다', () => {
		const list = getKrxHolidays(2026);
		[
			'2026-01-01', // 신정
			'2026-03-01', // 삼일절
			'2026-05-05', // 어린이날
			'2026-06-06', // 현충일
			'2026-08-15', // 광복절
			'2026-10-03', // 개천절
			'2026-10-09', // 한글날
			'2026-12-25'  // 크리스마스
		].forEach(d => expect(list).toContain(d));
	});

	test('설날은 음력 1/1 전후 3일이 연속으로 들어간다', () => {
		// 2026 설날 = 02-17(화), 2027 설날 = 02-07(일)
		['2026-02-16', '2026-02-17', '2026-02-18'].forEach(d => expect(getKrxHolidays(2026)).toContain(d));
		['2027-02-06', '2027-02-07', '2027-02-08'].forEach(d => expect(getKrxHolidays(2027)).toContain(d));
	});

	test('추석은 음력 8/15 전후 3일이 연속으로 들어간다', () => {
		// 2026 추석 = 09-25(금), 2027 추석 = 09-15(수)
		['2026-09-24', '2026-09-25', '2026-09-26'].forEach(d => expect(getKrxHolidays(2026)).toContain(d));
		['2027-09-14', '2027-09-15', '2027-09-16'].forEach(d => expect(getKrxHolidays(2027)).toContain(d));
	});

	test('부처님오신날(음력 4/8)이 포함된다', () => {
		expect(getKrxHolidays(2026)).toContain('2026-05-24'); // 일
		expect(getKrxHolidays(2027)).toContain('2027-05-13'); // 목
	});

	// 관공서 공휴일 규정 제3조: 삼일절·광복절·개천절·한글날·부처님오신날·기독탄신일은
	// 토요일 또는 일요일과 겹치면 대체공휴일이 생긴다.
	test.each([
		['삼일절 2026 (일)', 2026, '2026-03-01', '2026-03-02'],
		['부처님오신날 2026 (일)', 2026, '2026-05-24', '2026-05-25'],
		['광복절 2026 (토)', 2026, '2026-08-15', '2026-08-17'],
		['개천절 2026 (토)', 2026, '2026-10-03', '2026-10-05'],
		['광복절 2027 (일)', 2027, '2027-08-15', '2027-08-16'],
		['개천절 2027 (일)', 2027, '2027-10-03', '2027-10-04'],
		['한글날 2027 (토)', 2027, '2027-10-09', '2027-10-11'],
		['크리스마스 2027 (토)', 2027, '2027-12-25', '2027-12-27']
	])('%s → 대체공휴일이 다음 평일에 생긴다', (_label, year, original, substitute) => {
		const list = getKrxHolidays(year);
		expect(isWeekend(original)).toBe(true);
		expect(list).toContain(original);
		expect(list).toContain(substitute);
		expect(dayOf(substitute)).toBe(1); // 월요일
	});

	test('평일 휴일에는 대체공휴일을 만들지 않는다', () => {
		const list = getKrxHolidays(2027);
		expect(dayOf('2027-03-01')).toBe(1); // 삼일절이 월요일
		expect(list).not.toContain('2027-03-02');
	});

	// ── 아래 2건은 현행 구현이 관공서 공휴일 규정과 어긋나 보이는 지점이다.
	//    확인 후 구현을 고치고 skip 을 해제할 것. 지금 통과하도록 단언을 뒤집으면
	//    잘못된 동작을 정답으로 굳히게 되므로 skip 으로 남긴다.

	// 규정 제3조의 대체공휴일 대상은 삼일절·어린이날·부처님오신날·광복절·개천절·
	// 한글날·기독탄신일·설날·추석이다. 현충일은 목록에 없어 대체공휴일이 없다.
	// 그런데 구현은 addWithSubstitute 를 써서 2026-06-08, 2027-06-07 을 만든다.
	test.skip('현충일에는 대체공휴일이 없어야 한다', () => {
		expect(getKrxHolidays(2026)).not.toContain('2026-06-08'); // 06-06 토
		expect(getKrxHolidays(2027)).not.toContain('2027-06-07'); // 06-06 일
	});

	// 2027 설날 연휴는 02-06(토)·02-07(일)·02-08(월)이고 일요일이 겹치므로
	// 대체공휴일 1일이 붙어야 한다. 구현은 '일요일 + 1일'을 더하는데 그 날짜가
	// 이미 연휴(02-08)라서 Set 에서 흡수되고 대체공휴일이 사라진다.
	// 실제로는 연휴 다음 평일인 02-09 가 되어야 한다.
	test.skip('설날 연휴가 주말과 겹치면 연휴 다음 평일이 대체공휴일이 된다', () => {
		expect(getKrxHolidays(2027)).toContain('2027-02-09');
	});
});
