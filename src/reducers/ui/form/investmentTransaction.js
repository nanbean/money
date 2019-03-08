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
	isModalOpen: false,
	date: moment().format('YYYY-MM-DD')
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
			amount: state.price * payload + (state.activity === 'Buy' ? (1) : (-1)) * (state.commission ? state.commission : 0)
		}),
		[changePrice]: (state, { payload }) => ({
			...state,
			price: payload,
			amount: payload * state.quantity + (state.activity === 'Buy' ? (1) : (-1)) * (state.commission ? state.commission : 0)
		}),
		[changeCommission]: (state, { payload }) => ({
			...state,
			commission: payload,
			amount: state.price * state.quantity + (state.activity === 'Buy' ? (1) : (-1)) * (payload ? payload : 0)
		}),
		[changeAmount]: (state, { payload }) => ({
			...state,
			amount: payload
		})
	},
	initialState
);
