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

// 날짜는 부를 때마다 오늘로 만든다. 상수로 두면 모듈이 처음 불러와질 때 한 번만
// 계산되어, 앱을 며칠 열어 둔 채 새 거래를 입력하면 앱을 연 날이 들어갔다.
const today = () => moment().format('YYYY-MM-DD');
const makeInitialState = () => ({
	isEdit: false,
	isModalOpen: false,
	date: today(),
	activity: ''
});

export default handleActions(
	{
		[fillTransactionForm]: (state, { payload }) => ({
			...state,
			...payload
		}),
		[resetTransactionForm]: () => makeInitialState(),
		// 새 거래('New' 버튼)는 날짜 없이 열린다 — 그때는 지금 날짜를 넣는다. 편집·예정
		// 거래처럼 날짜를 넘기면 그 값을 쓴다.
		[openTransactionInModal]: (state, { payload }) => ({
			...state,
			...payload,
			date: (payload && payload.date) || today(),
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
	makeInitialState()
);
