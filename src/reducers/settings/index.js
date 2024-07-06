import { combineReducers } from 'redux';
import categoryList from './categoryList';
import exchangeRate from './exchangeRate';
import weeklyGraphAccount from './weeklyGraphAccount';

export default combineReducers({
	categoryList,
	exchangeRate,
	weeklyGraphAccount
});
