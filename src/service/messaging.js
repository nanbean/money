import firebase from 'firebase';

const config = {
	apiKey: 'AIzaSyCS_k9S2lcnWtSo01jw0ohaHTkn6a4tZI8',
	authDomain: 'nanbean-money.firebaseapp.com',
	databaseURL: 'https://nanbean-money.firebaseio.com',
	projectId: 'nanbean-money',
	storageBucket: 'nanbean-money.appspot.com',
	messagingSenderId: '532962069139'
};

firebase.initializeApp(config);

const messaging = firebase.messaging();

export default messaging;
