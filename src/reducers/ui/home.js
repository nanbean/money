import { handleActions } from 'redux-actions';
import {
	changeAccountsExpanded,
	changeLatestTransactionsExpanded,
	changeWeeklyGraphExpanded,
	changeStockListExpanded,
	changePaymentListExpanded
} from '../../actions/ui/homeActions';

const initialState = {
	accountsExpanded: true,
	latestTransactionsExpanded: true,
	weeklyGraphExpanded: true,
	stockListExpanded: true,
	paymentListExpanded: true
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
		[changeWeeklyGraphExpanded]: (state, { payload }) => ({
			...state,
			weeklyGraphExpanded: payload
		}),
		[changeStockListExpanded]: (state, { payload }) => ({
			...state,
			stockListExpanded: payload
		}),
		[changePaymentListExpanded]: (state, { payload }) => ({
			...state,
			paymentListExpanded: payload
		})
	},
	initialState
);
