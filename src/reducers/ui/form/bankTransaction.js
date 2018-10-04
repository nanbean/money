import {handleActions} from 'redux-actions';
import moment from 'moment';
import {
	fillTransactionForm,
	resetTransactionForm,
	openTransactionInModal,
	changeDate,
	changePayee,
	changeCategory,
	changeAmount,
	changeMemo
} from '../../../actions/ui/form/bankTransaction';

const initialState = {
	isModalOpen: false,
	date: moment().format('YYYY-MM-DD')
};

export default handleActions(
	{
		[fillTransactionForm]: (state, {payload}) => ({
			...state,
			...payload
		}),
		[resetTransactionForm]: () => ({
			...initialState
		}),
		[openTransactionInModal]: (state, {payload}) => ({
			...state,
			...payload,
			isModalOpen: true
		}),
		[changeDate]: (state, {payload}) => ({
			...state,
			date: payload
		}),
		[changePayee]: (state, {payload}) => ({
			...state,
			payee: payload
		}),
		[changeCategory]: (state, {payload}) => ({
			...state,
			category: payload
		}),
		[changeAmount]: (state, {payload}) => ({
			...state,
			amount: payload
		}),
		[changeMemo]: (state, {payload}) => ({
			...state,
			memo: payload
		})
	},
	initialState
);
