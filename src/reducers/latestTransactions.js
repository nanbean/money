import moment from 'moment';
import * as actions from '../actions/actionTypes';

const initialState = [];

export default function latestTransactions (state = initialState, action) {
	switch (action.type) {
	case actions.SET_WEEKLY_TRANSACTIONS:
	case actions.SET_ALL_ACCOUNTS_TRANSACTIONS:
		if (action.payload) {
			const start = moment().subtract(2, 'days').format('YYYY-MM-DD');
			const end = moment().format('YYYY-MM-DD');
			return action.payload.filter(i => i.date >= start && i.date <= end && !i.accountId.startsWith('account:Invst:'));
		} else {
			return state;
		}
	case actions.EDIT_ALL_ACCOUNTS_TRANSACTIONS:
		if (action.payload) {
			const findIndex = state.findIndex(i => i._id === action.payload._id);
			if (findIndex >= 0) {
				return state.map((item, index) => {
					if (index !== findIndex) {
						return item;
					}
					return {
						...item,
						...action.payload
					};
				});
			}
		}
		return state;
	case actions.ADD_OR_EDIT_ALL_ACCOUNTS_TRANSACTIONS: {
		if (!action.payload) return state;
		const tx = action.payload;
		const start = moment().subtract(2, 'days').format('YYYY-MM-DD');
		const end = moment().format('YYYY-MM-DD');
		const inRange = tx.date >= start && tx.date <= end && !tx.accountId.startsWith('account:Invst:');
		const existingIndex = state.findIndex(i => i._id === tx._id);
		if (existingIndex >= 0) {
			if (!inRange) return state.filter(i => i._id !== tx._id);
			return state.map((item, index) => index === existingIndex ? { ...item, ...tx } : item);
		}
		if (!inRange) return state;
		return [...state, tx].sort((a, b) => b.date.localeCompare(a.date));
	}
	case actions.DELETE_ALL_ACCOUNTS_TRANSACTIONS:
		if (action.payload) {
			return state.filter(i => i._id !== action.payload);
		}
		return state;
	default:
		return state;
	}
}
