const moment = require('moment-timezone');
const { isHoliday, isUsHoliday, setHolidays, setUsHolidays } = require('../utils/calendar');

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
