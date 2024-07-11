const key = require('./key.json');

const config = {
	couchDBUrl: process.env.REACT_APP_COUCHDB_URL,
	couchDBAdminId: process.env.REACT_APP_COUCHDB_ADMIN_ID,
	couchDBAdminPassword: process.env.REACT_APP_COUCHDB_ADMIN_PW,
	calendarPrimaryEmail: process.env.REACT_APP_CALENDAR_PRIMARY_EMAIL,
	reaitimeApiRul: process.env.REACT_APP_REALTIME_API_URL,
	googleSpreadsheetDocId: process.env.REACT_APP_GOOGLE_SPREADSHEET_DOC_ID,
	key
};

module.exports = config;
