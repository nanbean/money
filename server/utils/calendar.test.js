const moment = require('moment-timezone');
const { isHoliday, isUsHoliday, setHolidays, setUsHolidays } = require('../utils/calendar');

// Mock dependencies
jest.mock('googleapis', () => ({
	google: {
		auth: {
			JWT: jest.fn()
		},
		calendar: jest.fn(() => ({}))
	}
}));

jest.mock('../config', () => ({ calendarPrimaryEmail: 'test@example.com' }), { virtual: true });
jest.mock('../nanbean-435f267e8481.json', () => ({ client_email: 'test@client.com', private_key: 'private_key' }), { virtual: true });

describe('calendar service', () => {
	const todaySeoul = '2025-07-04';
	const todayLA = '2025-07-03';

	beforeAll(() => {
		moment.tz.setDefault('Asia/Seoul');
		jest.spyOn(moment.fn, 'format').mockImplementation(function (format) {
			if (this.tz() === 'America/Los_Angeles') {
				return todayLA;
			}
			return todaySeoul;
		});
	});

	afterAll(() => {
		moment.tz.setDefault();
		jest.restoreAllMocks();
	});

	describe('isHoliday', () => {
		it('should return true if today is a holiday in Korea', () => {
			// Arrange
			const holidays = [{ start: todaySeoul, summary: 'Test Holiday' }];
			setHolidays(holidays);

			// Act
			const result = isHoliday();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false if today is not a holiday in Korea', () => {
			// Arrange
			const holidays = [{ start: '2025-07-05', summary: 'Another Holiday' }];
			setHolidays(holidays);

			// Act
			const result = isHoliday();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for an empty holiday list', () => {
			// Arrange
			setHolidays([]);

			// Act
			const result = isHoliday();

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('isUsHoliday', () => {
		it('should return true if today is a holiday in the US', () => {
			// Arrange
			const usHolidays = [{ start: todayLA, summary: 'US Test Holiday' }];
			setUsHolidays(usHolidays);

			// Act
			const result = isUsHoliday();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false if today is not a holiday in the US', () => {
			// Arrange
			const usHolidays = [{ start: '2025-07-05', summary: 'Another US Holiday' }];
			setUsHolidays(usHolidays);

			// Act
			const result = isUsHoliday();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for an empty US holiday list', () => {
			// Arrange
			setUsHolidays([]);

			// Act
			const result = isUsHoliday();

			// Assert
			expect(result).toBe(false);
		});
	});
});
