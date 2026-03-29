import * as actions from '../actions/actionTypes';

const DEFAULT_LIVING_EXPENSE_EXEMPT = [
	'세금',
	'대출이자',
	'보험',
	'실제지출아님',
	'취미-레저:여행',
	'교통비:차량구입비',
	'건축'
];

const initialState = {
	currency: 'KRW',
	enableExchangeRateUpdate: true,
	exchangeRate: 1300,
	livingExpenseExempt: DEFAULT_LIVING_EXPENSE_EXEMPT,
	categoryList: []
};

export default function settings (state = initialState, action) {
	switch (action.type) {
	case actions.SET_SETTINGS: {
		const general = action.payload.reduce((obj, item) => {
			obj[item._id] = item.value;
			return obj;
		}, {});
		if (general) {
			return {
				livingExpenseExempt: DEFAULT_LIVING_EXPENSE_EXEMPT,
				...general
			};
		}
		return state;
	}
	default:
		return state;
	}
}
