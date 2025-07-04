const { stocksDB } = require('./index');

const getStock = async (id) => {
	return await stocksDB.get(id, { revs_info: true });
};

const insertStock = async (stock) => {
	return await stocksDB.insert(stock);
};

module.exports = {
	getStock,
	insertStock
};
