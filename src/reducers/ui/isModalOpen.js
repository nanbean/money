import * as actions from '../../actions/actionTypes';

const initialState = false;

export default function isModalOpen (state = initialState, action) {
	switch (action.type) {
	case actions.OPEN_TRANSACTION_IN_MODAL:
		return true;
	case actions.RESET_TRANSACTION_FORM:
		return false;
	default:
		return state;
	}
}
