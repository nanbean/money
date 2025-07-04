const config = require('./config');
const nano = require('nano')(`https://${config.couchDBAdminId}:${config.couchDBAdminPassword}@${config.couchDBUrl}`);

const accountsDB = nano.use('accounts_nanbean');
const transactionsDB = nano.use('transactions_nanbean');
const stocksDB = nano.use('stocks');
const settingsDB = nano.use('settings_nanbean');
const reportsDB = nano.use('reports_nanbean');
const notificationsDB = nano.use('notifications_nanbean');
const historiesDB = nano.use('histories_nanbean');

module.exports = {
	accountsDB,
	transactionsDB,
	stocksDB,
	settingsDB,
	reportsDB,
	notificationsDB,
	historiesDB
};