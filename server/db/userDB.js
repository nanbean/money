const config = require('../config');
const nano = require('nano')(`https://${config.couchDBAdminId}:${config.couchDBAdminPassword}@${config.couchDBUrl}`);

const _users = nano.use('_users');

const insertUser = async (user, id) => {
	return await _users.insert(user, id);
};

module.exports = {
	insertUser
};
