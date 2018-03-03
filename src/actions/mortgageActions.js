import {
	SET_MORTAGE_SCHEDULE
} from './actionTypes';

export const fetchGetMortgageScheduleSuccess = params => ({
	type: SET_MORTAGE_SCHEDULE,
	payload: params
});

export const fetchGetMortgageScheduleFailure = params => ({
	type: SET_MORTAGE_SCHEDULE,
	payload: []
});

export const getMortgageScheduleAction = () => (dispatch) => {
	const apiUrl = '/api/getMortgageSchedule';

	return fetch(apiUrl)
	.then(res => res.json())
	.then(body => {
		if (body.return) {
			dispatch(fetchGetMortgageScheduleSuccess(body));
		}
	})
	.catch(ex => dispatch(fetchGetMortgageScheduleFailure(ex)));
};
