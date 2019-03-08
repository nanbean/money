import { combineReducers } from 'redux';
import bankTransaction from './bankTransaction';
import investmentTransaction from './investmentTransaction';

export default combineReducers({ bankTransaction, investmentTransaction });
