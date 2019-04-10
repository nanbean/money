import { combineReducers } from 'redux';
import fetching from './fetching';
import status from './status';

export default combineReducers({
	fetching,
	status
});
