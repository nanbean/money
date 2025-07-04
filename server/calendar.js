const { google } = require('googleapis');
const moment = require('moment-timezone');

const config = require('./config');
const key = require('./nanbean-435f267e8481.json');
const SCOPES = 'https://www.googleapis.com/auth/calendar';

var auth = new google.auth.JWT(
	key.client_email,
	null,
	key.private_key,
	SCOPES,
	config.calendarPrimaryEmail
);

const calendar = google.calendar({
	version: 'v3',
	auth
});

let holidays = [
	// TODO: add custom holidays
];

let usHolidays = [
	// TODO: add custom holidays
];

const getHolidays = async () => {
	const res = await calendar.events.list({
		calendarId: 'ko.south_korea#holiday@group.v.calendar.google.com',
		timeMin: (new Date()).toISOString(),
		maxResults: 30,
		singleEvents: true,
		orderBy: 'startTime'
	});

	const events = res.data.items;

	if (events.length) {
		holidays = events.map(i => ({
			start: i.start.dateTime || i.start.date,
			summary: i.summary
		}));
	}
};

const getUsHolidays = async () => {
	const res = await calendar.events.list({
		calendarId: 'en.usa#holiday@group.v.calendar.google.com',
		timeMin: (new Date()).toISOString(),
		maxResults: 30,
		singleEvents: true,
		orderBy: 'startTime'
	});

	const events = res.data.items;

	if (events.length) {
		usHolidays = events.map(i => ({
			start: i.start.dateTime || i.start.date,
			summary: i.summary
		}));
	}
};

exports.initialize = async () => {
	const results = await Promise.allSettled([getHolidays(), getUsHolidays()]);
	results.forEach(result => {
		if (result.status === 'rejected') {
			console.error('Failed to fetch a holiday calendar:', result.reason);
		}
	});
};

exports.isHoliday = () => {
	const date = moment().tz('Asia/Seoul').format('YYYY-MM-DD');
	if (holidays.find(i => i.start === date)) {
		console.log('Today is ' + date + ' and it is holiday');
		return true;
	}

	return false;
};

exports.isUsHoliday = () => {
	const date = moment().tz('America/Los_Angeles').format('YYYY-MM-DD');
	if (usHolidays.find(i => i.start === date)) {
		console.log('Today is ' + date + ' and it is holiday');
		return true;
	}

	return false;
};

if (process.env.NODE_ENV === 'test') {
	exports.setHolidays = (newHolidays) => {
		holidays = newHolidays;
	};
	exports.setUsHolidays = (newUsHolidays) => {
		usHolidays = newUsHolidays;
	};
}