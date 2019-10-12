import moment from 'moment';
import * as actions from '../actions/actionTypes';

const initialState = [];

export default function weeklyTransactions (state = initialState, action) {
	switch (action.type) {
	case actions.SET_WEEKLY_TRANSACTIONS:
	case actions.SET_ALL_ACCOUNTS_TRANSACTIONS:
		if (action.payload) {
			const start = moment().subtract(1, 'weeks').format('YYYY-MM-DD');
			const end = moment().format('YYYY-MM-DD');
			return action.payload.filter(i => i.date >= start && i.date <= end && !i.accountId.startsWith('account:Invst:'));
		} else {
			return state;
		}
	default:
		return state;
	}
}
