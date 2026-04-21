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

// 한국 대체공휴일: 토 → 다음 월, 일 → 다음 월
const krSubstitute = (d) => {
	const day = d.day();
	if (day === 0) return d.clone().add(1, 'day');
	if (day === 6) return d.clone().add(2, 'days');
	return null;
};

const getKrxHolidays = (year) => {
	const dates = new Set();
	const add = (d) => dates.add(d.format('YYYY-MM-DD'));
	const addWithSubstitute = (d) => {
		add(d);
		const sub = krSubstitute(d);
		if (sub) add(sub);
	};

	// 신정
	addWithSubstitute(moment.tz(`${year}-01-01`, 'Asia/Seoul'));

	// 설날 (음력 1/1 전후 3일)
	const seollal = lunarToSolar(year, 1, 1);
	const seollalDays = [seollal.clone().subtract(1, 'day'), seollal.clone(), seollal.clone().add(1, 'day')];
	seollalDays.forEach(d => add(d));
	// 설날 연휴 중 일요일 겹치면 대체공휴일
	seollalDays.forEach(d => { if (d.day() === 0) add(d.clone().add(1, 'day')); });
	// 다른 공휴일과 겹치는 경우(신정 등) 추가 대체
	seollalDays.forEach(d => {
		if (d.format('MM-DD') === '01-01') add(seollal.clone().add(2, 'days'));
	});

	// 3·1절
	addWithSubstitute(moment.tz(`${year}-03-01`, 'Asia/Seoul'));

	// 어린이날
	addWithSubstitute(moment.tz(`${year}-05-05`, 'Asia/Seoul'));

	// 부처님오신날 (음력 4/8)
	addWithSubstitute(lunarToSolar(year, 4, 8));

	// 현충일 (2021년부터 대체공휴일)
	addWithSubstitute(moment.tz(`${year}-06-06`, 'Asia/Seoul'));

	// 광복절
	addWithSubstitute(moment.tz(`${year}-08-15`, 'Asia/Seoul'));

	// 추석 (음력 8/15 전후 3일)
	const chuseok = lunarToSolar(year, 8, 15);
	const chuseokDays = [chuseok.clone().subtract(1, 'day'), chuseok.clone(), chuseok.clone().add(1, 'day')];
	chuseokDays.forEach(d => add(d));
	// 추석 연휴 중 일요일 또는 개천절(10/3) 겹치면 대체공휴일
	let chuseokSubNeeded = 0;
	chuseokDays.forEach(d => {
		if (d.day() === 0 || d.format('MM-DD') === '10-03') chuseokSubNeeded++;
	});
	for (let i = 1; i <= chuseokSubNeeded; i++) {
		add(chuseok.clone().add(1 + i, 'days'));
	}

	// 개천절
	addWithSubstitute(moment.tz(`${year}-10-03`, 'Asia/Seoul'));

	// 한글날
	addWithSubstitute(moment.tz(`${year}-10-09`, 'Asia/Seoul'));

	// 크리스마스
	addWithSubstitute(moment.tz(`${year}-12-25`, 'Asia/Seoul'));

	return [...dates].sort();
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
		observed(moment.tz(`${year}-12-25`, 'America/New_York')),   // Christmas
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
}