import firebase from 'firebase';

const config = {
	apiKey: 'your_api_key',
	authDomain: 'project_id.firebaseapp.com',
	databaseURL: 'https://project_id.firebaseio.com',
	projectId: 'project_id',
	storageBucket: 'project_id.appspot.com',
	messagingSenderId: 'your_sender_id'
};

firebase.initializeApp(config);

const messaging = firebase.messaging();

export default messaging;
