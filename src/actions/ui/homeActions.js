import { createActions } from 'redux-actions';

export const {
	changeAccountsExpanded,
	changeLatestTransactionsExpanded,
	changeSummaryExpanded,
	changeWeeklyGraphExpanded
} = createActions(
	'CHANGE_ACCOUNTS_EXPANDED',
	'CHANGE_LATEST_TRANSACTIONS_EXPANDED',
	'CHANGE_SUMMARY_EXPANDED',
	'CHANGE_WEEKLY_GRAPH_EXPANDED'
);
