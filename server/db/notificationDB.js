const { notificationsDB } = require('./index');

const addNotification = async (notification) => {
	return await notificationsDB.insert(notification);
};

const listNotifications = async (size) => {
	const notifications = await notificationsDB.list({
		include_docs: true,
		descending: true,
		limit: size
	});
	return notifications.rows.map(i => i.doc);
};

module.exports = {
	addNotification,
	listNotifications
};
