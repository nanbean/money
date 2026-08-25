const moment = require('moment-timezone');
const calendar = require('./calendar');
const { isKrRegularSession, CLOSE_GRACE_MINUTES } = require('./marketHours');

jest.mock('./calendar', () => ({
	isHoliday: jest.fn(),
	isUsHoliday: jest.fn()
}));

// 2026-08-26 은 수요일, 2026-08-29 는 토요일.
const kst = (t) => moment.tz(`2026-08-26 ${t}`, 'Asia/Seoul');

describe('marketHours', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		calendar.isHoliday.mockReturnValue(false);
	});

	describe('isKrRegularSession (09:00~15:30 KST)', () => {
		test.each([
			['08:59', false],
			['09:00', true],
			['12:00', true],
			['15:29', true],
			['15:30', true],   // 마감 분(分)은 포함
			['15:31', true],   // 크론(15:30:30)을 잡기 위한 grace
			['15:32', false],  // grace 종료
			['15:45', false],  // NXT 애프터마켓
			['19:00', false],
			['23:00', false]
		])('%s → %s', (time, expected) => {
			expect(isKrRegularSession(kst(time))).toBe(expected);
		});

		test('마감 크론(15:30:30 KST)은 정규장으로 인정된다', () => {
			const cronMoment = moment.tz('2026-08-26 15:30:30', 'Asia/Seoul');
			expect(isKrRegularSession(cronMoment)).toBe(true);
		});

		test('공휴일이면 장중 시각이라도 false', () => {
			calendar.isHoliday.mockReturnValue(true);
			expect(isKrRegularSession(kst('12:00'))).toBe(false);
		});

		test('주말이면 false', () => {
			const saturday = moment.tz('2026-08-29 12:00', 'Asia/Seoul');
			expect(isKrRegularSession(saturday)).toBe(false);
		});
	});

	test('grace 는 NXT 애프터마켓(15:40)에 물들지 않게 짧게 유지한다', () => {
		expect(CLOSE_GRACE_MINUTES).toBeLessThanOrEqual(9);
	});
});
