import { combineReducers } from 'redux';
import exchangeRate from './exchangeRate';
import weeklyGraphAccount from './weeklyGraphAccount';

export default combineReducers({
	exchangeRate,
	weeklyGraphAccount
});
