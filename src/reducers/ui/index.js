import { combineReducers } from 'redux';
import isSidebarOpen from './isSidebarOpen';
import form from './form';

export default combineReducers({
	isSidebarOpen,
	form
});
