import { combineReducers } from 'redux';
import categoryList from './categoryList';
import general from './general';
import paymentList from './paymentList';
import weeklyGraphAccount from './weeklyGraphAccount';

export default combineReducers({
	categoryList,
	general,
	paymentList,
	weeklyGraphAccount
});
