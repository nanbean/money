import { combineReducers } from 'redux';
import isSidebarOpen from './isSidebarOpen';
import form from './form';
import home from './home';

export default combineReducers({
	isSidebarOpen,
	form,
	home
});
