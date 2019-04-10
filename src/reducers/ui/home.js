import { handleActions } from 'redux-actions';
import {
	changeAccountsExpanded,
	changeLastTransactionsExpanded,
	changeSummaryExpanded,
	changeWeeklyGraphExpanded
} from '../../actions/ui/homeActions';

const initialState = {
	accountsExpanded: true,
	lastTransactionsExpanded: true,
	summaryExpanded: true,
	weeklyGraphExpanded: true
};

export default handleActions(
	{
		[changeAccountsExpanded]: (state, { payload }) => ({
			...state,
			accountsExpanded: payload
		}),
		[changeLastTransactionsExpanded]: (state, { payload }) => ({
			...state,
			lastTransactionsExpanded: payload
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
