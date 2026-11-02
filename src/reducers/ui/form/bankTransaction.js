import { handleActions } from 'redux-actions';
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

// 날짜는 부를 때마다 오늘로 만든다. 상수로 두면 모듈이 처음 불러와질 때 한 번만
// 계산되어, 앱을 며칠 열어 둔 채 새 거래를 입력하면 앱을 연 날이 들어갔다.
const today = () => moment().format('YYYY-MM-DD');
const makeInitialState = () => ({
	isEdit: false,
	isModalOpen: false,
	date: today(),
	category: ''
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
		[changePayee]: (state, { payload }) => ({
			...state,
			payee: payload
		}),
		[changeCategory]: (state, { payload }) => ({
			...state,
			category: payload
		}),
		[changeAmount]: (state, { payload }) => ({
			...state,
			amount: payload
		}),
		[changeMemo]: (state, { payload }) => ({
			...state,
			memo: payload
		})
	},
	makeInitialState()
);
