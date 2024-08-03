import { combineReducers } from 'redux';
import categoryList from './categoryList';
import exchangeRate from './exchangeRate';
import paymentList from './paymentList';
import weeklyGraphAccount from './weeklyGraphAccount';

export default combineReducers({
	categoryList,
	exchangeRate,
	paymentList,
	weeklyGraphAccount
});
