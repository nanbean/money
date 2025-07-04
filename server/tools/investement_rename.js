const config = require('../config');
const nano = require('nano')(`http://${config.couchDBAdminId}:${config.couchDBAdminPassword}@${config.couchDBUrl}`);
const args = process.argv.slice(2);

const renameInvestment = async (oldName, newName) => {
	const transactionDB = nano.use('transactions_nanbean');
	const investmentDB = nano.use('investments_nanbean');
	const historyDB = nano.use('histories_nanbean');
  
	const historyResponse = await historyDB.find({
		selector: {
			name: { '$eq': oldName }
		},
		limit: 100000
	});
	const histories = historyResponse.docs;

	histories.forEach(i => i.name = newName);

	console.log(histories);

	await historyDB.bulk({ docs: histories });
  
	const investementResponse = await investmentDB.find({
		selector: {
			name: { '$eq': oldName }
		},
		limit: 100000
	});
	const investments = investementResponse.docs;

	investments.forEach(i => i.name = newName);

	console.log(investments);

	await investmentDB.bulk({ docs: investments });
  
	const transactionResponse = await transactionDB.find({
		selector: {
			investment: { '$eq': oldName }
		},
		limit: 100000
	});
	const transactions = transactionResponse.docs;

	transactions.forEach(i => i.investment = newName);

	console.log(transactions);
  
	await transactionDB.bulk({ docs: transactions });
};

renameInvestment(args[0], args[1]);

