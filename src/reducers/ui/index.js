import { combineReducers } from 'redux';
import isSidebarOpen from './isSidebarOpen';
import isMobile from './isMobile';
import form from './form';

export default combineReducers({
	isSidebarOpen,
	isMobile,
	form
});
