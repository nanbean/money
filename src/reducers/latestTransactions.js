import moment from 'moment';
import * as actions from '../actions/actionTypes';

const initialState = [];

export default function latestTransactions (state = initialState, action) {
	switch (action.type) {
	case actions.SET_WEEKLY_TRANSACTIONS:
	case actions.SET_ALL_ACCOUNTS_TRANSACTIONS:
		console.log(action.type)
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
						return item
					}
					return {
						...item,
						...action.payload
					}
				});
			}
		}
		
		return state;
	default:
		return state;
	}
}
