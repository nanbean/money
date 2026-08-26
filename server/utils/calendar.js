const moment = require('moment-timezone');
const KoreanLunarCalendar = require('korean-lunar-calendar');

// 음력 날짜 → 양력 날짜 변환
const lunarToSolar = (lunarYear, lunarMonth, lunarDay) => {
	const cal = new KoreanLunarCalendar();
	cal.setLunarDate(lunarYear, lunarMonth, lunarDay, false);
	const solar = cal.getSolarCalendar();
	return moment.tz(
		`${solar.year}-${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')}`,
		'Asia/Seoul'
	);
};

const SUNDAY = 0;
const SATURDAY = 6;

// 관공서의 공휴일에 관한 규정 제3조. 대체공휴일 규칙이 공휴일마다 다르다.
//   - 신정·현충일: 대체공휴일 대상이 아니다 (규정 목록에 없음)
//   - 삼일절·부처님오신날·광복절·개천절·한글날·기독탄신일: 토·일과 겹치면 생긴다
//   - 어린이날: 토·일 또는 다른 공휴일과 겹치면 생긴다
//   - 설날·추석 연휴: 일요일 또는 다른 공휴일과 겹친 일수만큼 생긴다
//
// 대체공휴일은 '그 공휴일 다음의 첫 번째 비공휴일'이다. 일요일 자체가 공휴일이라
// 건너뛰고, 토요일은 공휴일이 아니지만 토요일 공휴일의 다음날은 항상 일요일이므로
// 결과적으로 월요일로 밀린다.
const getKrxHolidays = (year) => {
	const fmt = (d) => d.format('YYYY-MM-DD');
	const seoul = (monthDay) => moment.tz(`${year}-${monthDay}`, 'Asia/Seoul');
	const consecutive3 = (center) => [-1, 0, 1].map(offset => center.clone().add(offset, 'day'));

	const buddha = lunarToSolar(year, 4, 8);
	const childrensDay = seoul('05-05');
	const seollalDays = consecutive3(lunarToSolar(year, 1, 1));
	const chuseokDays = consecutive3(lunarToSolar(year, 8, 15));

	const noSubstitute = [seoul('01-01'), seoul('06-06')];
	const weekendSubstitute = [
		seoul('03-01'), buddha, seoul('08-15'), seoul('10-03'), seoul('10-09'), seoul('12-25')
	];

	// 1단계: 대체공휴일을 붙이기 전의 공휴일 집합.
	const holidays = new Set(
		[...noSubstitute, ...weekendSubstitute, childrensDay, ...seollalDays, ...chuseokDays].map(fmt)
	);

	// 2단계: 대체공휴일. 이미 잡힌 공휴일 위에 겹치지 않도록 순차로 채운다.
	const addSubstituteAfter = (day) => {
		const cursor = day.clone();
		do {
			cursor.add(1, 'day');
		} while (cursor.day() === SUNDAY || holidays.has(fmt(cursor)));
		holidays.add(fmt(cursor));
		return cursor;
	};
	const isWeekend = (d) => d.day() === SUNDAY || d.day() === SATURDAY;

	weekendSubstitute.filter(isWeekend).forEach(addSubstituteAfter);

	// 어린이날은 다른 공휴일과 겹칠 때도 대체공휴일이 생긴다
	// (예: 2025년은 부처님오신날과 같은 날이라 5/6 이 대체공휴일).
	const otherFixed = [...noSubstitute, ...weekendSubstitute].map(fmt);
	if (isWeekend(childrensDay) || otherFixed.includes(fmt(childrensDay))) {
		addSubstituteAfter(childrensDay);
	}

	// 설날·추석 연휴는 일요일 또는 다른 공휴일과 겹친 일수만큼 뒤로 붙는다.
	const otherThanLunar = new Set([...otherFixed, fmt(childrensDay)]);
	for (const holidayRun of [seollalDays, chuseokDays]) {
		const clashes = holidayRun.filter(d => d.day() === SUNDAY || otherThanLunar.has(fmt(d))).length;
		let cursor = holidayRun[holidayRun.length - 1];
		for (let i = 0; i < clashes; i++) cursor = addSubstituteAfter(cursor);
	}

	return [...holidays].sort();
};

let holidays = [];

// NYSE 공휴일 알고리즘 계산 (Google 캘린더 대체)
// 참고: https://www.nyse.com/markets/hours-calendars
const observed = (d) => {
	if (d.day() === 6) return d.clone().subtract(1, 'day'); // 토 → 금
	if (d.day() === 0) return d.clone().add(1, 'day');      // 일 → 월
	return d.clone();
};

const nthWeekday = (year, month, dayOfWeek, n) => {
	const d = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'America/New_York');
	let count = 0;
	while (count < n) {
		if (d.day() === dayOfWeek) count++;
		if (count < n) d.add(1, 'day');
	}
	return d;
};

const lastWeekday = (year, month, dayOfWeek) => {
	const d = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'America/New_York').endOf('month').startOf('day');
	while (d.day() !== dayOfWeek) d.subtract(1, 'day');
	return d;
};

// Butcher-Meeus 알고리즘으로 부활절 계산
const getEasterSunday = (year) => {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	return moment.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, 'America/New_York');
};

const getNyseHolidays = (year) => {
	const dates = [
		observed(moment.tz(`${year}-01-01`, 'America/New_York')),  // New Year's Day
		nthWeekday(year, 1, 1, 3),                                  // MLK Day (3rd Mon Jan)
		nthWeekday(year, 2, 1, 3),                                  // Presidents' Day (3rd Mon Feb)
		getEasterSunday(year).subtract(2, 'days'),                  // Good Friday
		lastWeekday(year, 5, 1),                                    // Memorial Day (last Mon May)
		observed(moment.tz(`${year}-07-04`, 'America/New_York')),   // Independence Day
		nthWeekday(year, 9, 1, 1),                                  // Labor Day (1st Mon Sep)
		nthWeekday(year, 11, 4, 4),                                 // Thanksgiving (4th Thu Nov)
		observed(moment.tz(`${year}-12-25`, 'America/New_York'))    // Christmas
	];
	// Juneteenth (2022년부터)
	if (year >= 2022) {
		dates.push(observed(moment.tz(`${year}-06-19`, 'America/New_York')));
	}
	return dates.map(d => d.format('YYYY-MM-DD'));
};

let usHolidays = [];

exports.initialize = async () => {
	const year = new Date().getFullYear();

	// KRX 공휴일: 알고리즘 계산 (연말 크로스 대비 다음 해 포함)
	holidays = [
		...getKrxHolidays(year),
		...getKrxHolidays(year + 1)
	];
	console.log(`KRX holidays loaded: ${holidays.join(', ')}`);

	// NYSE 공휴일: 알고리즘 계산
	usHolidays = [
		...getNyseHolidays(year),
		...getNyseHolidays(year + 1)
	];
	console.log(`NYSE holidays loaded: ${usHolidays.join(', ')}`);
};

exports.isHoliday = () => {
	const date = moment().tz('Asia/Seoul').format('YYYY-MM-DD');
	if (holidays.includes(date)) {
		console.log('Today is ' + date + ' and it is KRX holiday');
		return true;
	}

	return false;
};

exports.isUsHoliday = () => {
	const date = moment().tz('America/New_York').format('YYYY-MM-DD');
	if (usHolidays.includes(date)) {
		console.log('Today is ' + date + ' and it is NYSE holiday');
		return true;
	}

	return false;
};

if (process.env.NODE_ENV === 'test') {
	exports.setHolidays = (newHolidays) => { holidays = newHolidays; };
	exports.setUsHolidays = (newUsHolidays) => { usHolidays = newUsHolidays; };
	// 휴일 생성 로직 자체를 검증하기 위한 test-only export.
	exports.getKrxHolidays = getKrxHolidays;
	exports.getNyseHolidays = getNyseHolidays;
}