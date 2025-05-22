import { combineReducers } from 'redux';
import categoryList from './categoryList';
import enableExchangeRateUpdate from './enableExchangeRateUpdate';
import exchangeRate from './exchangeRate';
import paymentList from './paymentList';
import weeklyGraphAccount from './weeklyGraphAccount';

export default combineReducers({
	categoryList,
	enableExchangeRateUpdate,
	exchangeRate,
	paymentList,
	weeklyGraphAccount
});
