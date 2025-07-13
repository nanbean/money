import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import configureStore from './store';
const container = document.getElementById('root');
const root = createRoot(container);
const store = configureStore();

root.render(
	<Provider store={store}>
		<App />
	</Provider>);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register({
	onUpdate: registration => {
		const waitingServiceWorker = registration.waiting;

		if (waitingServiceWorker) {
			if (window.confirm('There is a new version available. Would you like to update now?')) {
				waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
				waitingServiceWorker.addEventListener('statechange', event => {
					if (event.target.state === 'activated') {
						window.location.reload();
					}
				});
			}
		}
	}
});