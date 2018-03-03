import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import money from '../reducers';

export default function configureStore (initialState) {
	const store = createStore(
		money,
		initialState,
		applyMiddleware(thunkMiddleware) // lets us dispatch functions
	);
	return store;
}
