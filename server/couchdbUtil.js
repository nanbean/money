const getSymbolWithName = (investments, name) => {
	if (investments && name) {
		const investment = investments && investments.find(i => i.name === name);

		if (investment && investment.yahooSymbol) {
			return investment.yahooSymbol.substr(0, 6);
		}
	}

	return '';
};

exports.getSymbolWithName = getSymbolWithName;

const getInvestmentsFromTransactions = (investements, transactions) => {
	if (investements && transactions) {
		const investmentsTransactions = transactions.filter(i => i.accountId && i.accountId.startsWith('account:Invst'));

		return investmentsTransactions.map(i => ({_id: `histories:${getSymbolWithName(investements, i.investment)}`, name: i.investment}));
	}

	return [];
};

exports.getInvestmentsFromTransactions = getInvestmentsFromTransactions;