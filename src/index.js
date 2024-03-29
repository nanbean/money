import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import App from './App';
import registerServiceWorker from './registerServiceWorker';
import configureStore from './store';
const container = document.getElementById('root');
const root = createRoot(container);
const store = configureStore();

root.render(
	<Provider store={store}>
		<App />
	</Provider>);
registerServiceWorker();
