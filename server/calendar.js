const {google} = require('googleapis');
const dayjs = require('dayjs');

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

const getHolidays = async () => {
	const res = await calendar.events.list({
		calendarId: 'ko.south_korea#holiday@group.v.calendar.google.com',
		timeMin: (new Date()).toISOString(),
		maxResults: 10,
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

getHolidays().catch(console.error);

exports.isHoliday = () => {
	const date = dayjs().format('YYYY-MM-DD');
	if (holidays.find(i => i.start === date)) {
		return true;
	}

	return false;
};