const accountService = require('./services/accountService');
const transactionService = require('./services/transactionService');
const notificationService = require('./services/notificationService');
const settingService = require('./services/settingService');
const investmentService = require('./services/investmentService');
const reportService = require('./services/reportService');
const scheduler = require('./scheduler');

module.exports = {
	// accountService
	getAccounts: accountService.getAllAccounts,
	
	// transactionService
	getTransactions: transactionService.getAllTransactions,
	addTransaction: transactionService.addTransaction,

	// notificationService
	addNotification: notificationService.addNotification,
	listNotifications: notificationService.listNotifications,

	// settingService
	getExchangeRate: settingService.getExchangeRate,
	getCurrency: settingService.getCurrency,
	getCategoryList: settingService.getCategoryList,
	arrangeExchangeRate: settingService.arrangeExchangeRate,

	// investmentService
	arrangeKRInvestmemt: investmentService.arrangeKRInvestmemt,

	// reportService
	getLifetimeFlowList: reportService.getLifetimeFlowList,
	getNetWorth: reportService.getNetWorth,
	updateNetWorth: reportService.updateNetWorth,

	// scheduler
	updateInvestmentPrice: scheduler.updateInvestmentPrice,
};
