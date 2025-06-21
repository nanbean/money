import { createActions } from 'redux-actions';

export const {
	changeAccountsExpanded,
	changeLatestTransactionsExpanded,
	changeWeeklyGraphExpanded,
	changeStockListExpanded,
	changePaymentListExpanded
} = createActions({
	CHANGE_ACCOUNTS_EXPANDED: null,
	CHANGE_LATEST_TRANSACTIONS_EXPANDED: null,
	CHANGE_WEEKLY_GRAPH_EXPANDED: null,
	CHANGE_STOCK_LIST_EXPANDED: null,
	CHANGE_PAYMENT_LIST_EXPANDED: null
});
