import {
	SET_UPDATE_INVESTMENT_PRICE_FETCHING
} from './actionTypes';

import { showToast, showAuthExpiredToast } from './toastActions';

export const getInvestmentPriceFetching = params => ({
	type: SET_UPDATE_INVESTMENT_PRICE_FETCHING,
	payload: params
});

export const updateInvestmentPriceAction = () => async (dispatch) => {
	const apiUrl = '/api/updateInvestmentPrice';

	dispatch(getInvestmentPriceFetching(true));
	try {
		const res = await fetch(apiUrl, { credentials: 'include' });

		if (res.status === 401 || res.status === 403) {
			dispatch(showAuthExpiredToast());
			return;
		}

		if (!res.ok) {
			dispatch(showToast({
				message: `시세 업데이트에 실패했습니다. (${res.status})`,
				severity: 'error'
			}));
			return;
		}

		const body = await res.json();

		if (body && body.return) {
			dispatch(showToast({ message: '시세를 업데이트했습니다.', severity: 'success' }));
		} else {
			dispatch(showToast({ message: '시세 업데이트에 실패했습니다.', severity: 'error' }));
		}
	} catch (err) {
		// 네트워크 단절/타임아웃 등 응답 자체를 못 받은 경우.
		dispatch(showToast({
			message: '서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.',
			severity: 'error'
		}));
	} finally {
		// 어떤 경로로 끝나든 스피너는 반드시 내려야 한다.
		dispatch(getInvestmentPriceFetching(false));
	}
};
