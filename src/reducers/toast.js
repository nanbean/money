import * as actions from '../actions/actionTypes';

const initialState = {
	open: false,
	message: '',
	severity: 'info',
	actionType: null
};

export default function toast (state = initialState, action) {
	switch (action.type) {
	case actions.SHOW_TOAST:
		return {
			open: true,
			message: action.payload.message,
			severity: action.payload.severity,
			actionType: action.payload.actionType
		};
	case actions.HIDE_TOAST:
		// 메시지는 유지한 채 open만 내려야 스낵바 fade-out 중 내용이 사라지지 않는다.
		return { ...state, open: false };
	default:
		return state;
	}
}
