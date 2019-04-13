import { handleActions } from 'redux-actions';
import {
	changeAccountsExpanded,
	changeLatestTransactionsExpanded,
	changeSummaryExpanded,
	changeWeeklyGraphExpanded
} from '../../actions/ui/homeActions';

const initialState = {
	accountsExpanded: true,
	latestTransactionsExpanded: true,
	summaryExpanded: true,
	weeklyGraphExpanded: true
};

export default handleActions(
	{
		[changeAccountsExpanded]: (state, { payload }) => ({
			...state,
			accountsExpanded: payload
		}),
		[changeLatestTransactionsExpanded]: (state, { payload }) => ({
			...state,
			latestTransactionsExpanded: payload
		}),
		[changeSummaryExpanded]: (state, { payload }) => ({
			...state,
			summaryExpanded: payload
		}),
		[changeWeeklyGraphExpanded]: (state, { payload }) => ({
			...state,
			weeklyGraphExpanded: payload
		})
	},
	initialState
);
