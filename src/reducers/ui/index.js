import { combineReducers } from 'redux';
import isSidebarOpen from './isSidebarOpen';
import isMobile from './isMobile';
import form from './form';
import home from './home';

export default combineReducers({
	isSidebarOpen,
	isMobile,
	form,
	home
});
