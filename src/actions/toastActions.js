import {
	SHOW_TOAST,
	HIDE_TOAST
} from './actionTypes';

// severity: 'success' | 'info' | 'warning' | 'error'
// actionType: 옵션. 'signin' 이면 스낵바에 다시 로그인 버튼을 노출한다.
export const showToast = ({ message, severity = 'info', actionType = null }) => ({
	type: SHOW_TOAST,
	payload: { message, severity, actionType }
});

export const hideToast = () => ({
	type: HIDE_TOAST
});

export const showAuthExpiredToast = () => showToast({
	message: '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.',
	severity: 'warning',
	actionType: 'signin'
});
