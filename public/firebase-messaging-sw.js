// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js");
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js');

const firebase_config = {
	apiKey: 'AIzaSyCS_k9S2lcnWtSo01jw0ohaHTkn6a4tZI8',
	projectId: 'nanbean-money',
	messagingSenderId: '532962069139',
	appId: '1:532962069139:web:1ce56422bf4fde57'
}

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp(firebase_config);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload => {
	const notificationTitle = payload.data.title;
	const notificationOptions = {
		body: payload.data.body,
		icon: payload.data.icon,
		badge: payload.data.badge,
	};

	self.registration.showNotification(notificationTitle, notificationOptions);
});
