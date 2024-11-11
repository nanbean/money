import { handleActions } from 'redux-actions';
import moment from 'moment';
import {
	fillTransactionForm,
	resetTransactionForm,
	openTransactionInModal,
	changeDate,
	changeInvestment,
	changeActivity,
	changeQuantity,
	changePrice,
	changeCommission,
	changeAmount
} from '../../../actions/ui/form/investmentTransaction';

const initialState = {
	isEdit: false,
	isModalOpen: false,
	date: moment().format('YYYY-MM-DD'),
	activity: ''
};

export default handleActions(
	{
		[fillTransactionForm]: (state, { payload }) => ({
			...state,
			...payload
		}),
		[resetTransactionForm]: () => ({
			...initialState
		}),
		[openTransactionInModal]: (state, { payload }) => ({
			...state,
			...payload,
			isModalOpen: true
		}),
		[changeDate]: (state, { payload }) => ({
			...state,
			date: payload
		}),
		[changeInvestment]: (state, { payload }) => ({
			...state,
			investment: payload
		}),
		[changeActivity]: (state, { payload }) => ({
			...state,
			activity: payload
		}),
		[changeQuantity]: (state, { payload }) => ({
			...state,
			quantity: payload,
			amount: Number((state.price * payload + (state.activity === 'Buy' ? (1) : (-1)) * (state.commission ? state.commission : 0)).toFixed(2))
		}),
		[changePrice]: (state, { payload }) => ({
			...state,
			price: payload,
			amount: Number((payload * state.quantity + (state.activity === 'Buy' ? (1) : (-1)) * (state.commission ? state.commission : 0)).toFixed(2))
		}),
		[changeCommission]: (state, { payload }) => ({
			...state,
			commission: payload,
			amount: Number((state.price * state.quantity + (state.activity === 'Buy' ? (1) : (-1)) * (payload ? payload : 0)).toFixed(2))
		}),
		[changeAmount]: (state, { payload }) => ({
			...state,
			amount: payload
		})
	},
	initialState
);
