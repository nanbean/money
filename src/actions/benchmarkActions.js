import { SET_SP500_BENCHMARK } from './actionTypes';

// Pulls the SPY (S&P 500 tracking ETF) timeseries cached on the server. The
// shape is [{ date: 'YYYY-MM-DD', close: number }, ...] in chronological
// order. Server backfills/updates via KIS connector; this action just reads.
export const getSp500BenchmarkAction = () => {
	return async (dispatch) => {
		try {
			const res = await fetch('/api/benchmark/sp500');
			if (!res.ok) return;
			const json = await res.json();
			dispatch({
				type: SET_SP500_BENCHMARK,
				payload: Array.isArray(json.data) ? json.data : []
			});
		} catch (err) {
			console.log('getSp500BenchmarkAction error:', err); // eslint-disable-line no-console
		}
	};
};
