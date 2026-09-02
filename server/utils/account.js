// 투자 계좌와 동반 현금 계좌.
//
// 현금 계좌 문서는 일반 Bank 계좌와 필드가 완전히 같고, 구분되는 신호가 이름
// 접미사뿐이다. 그래서 여러 곳이 name.match(/_Cash/i) 로 걸러 왔는데, 앵커도
// 대소문자 구분도 없어 'MY_CashFlow' 같은 이름이 조용히 투자현금으로 취급된다.
//
// 클라이언트는 src/utils/investmentCash.js 를 쓴다. 서버는 CommonJS 라 같은
// 모듈을 공유할 수 없어 판정만 여기에 맞춰 둔다.
const CASH_SUFFIX = '_Cash';

const isInvestmentCashName = (name) =>
	typeof name === 'string'
	&& name.length > CASH_SUFFIX.length
	&& name.endsWith(CASH_SUFFIX);

const isInvestmentCash = (account) =>
	!!account && isInvestmentCashName(account.name);

// 'IRP_Cash' -> 'IRP'
//
// 예전에는 name.split('_')[0] 로 잘랐다. 지금 계좌 이름에는 '_' 가 접미사에만
// 있어서 결과가 같지만, 이름에 '_' 가 들어가는 순간 부모를 못 찾는다.
const invstAccountNameFor = (cashName) =>
	(isInvestmentCashName(cashName) ? cashName.slice(0, -CASH_SUFFIX.length) : null);

const getBalance = (name, transactions, investmentTransactions) => {
	let balance = 0;
	for (let i = 0; i < transactions.length; i++) {
		const transaction = transactions[i];
		if (transaction) {
			balance += transaction.amount;
		}
	}

	// We have to subtract ivestment in investment cash account
	if (isInvestmentCashName(name)) {
		if (investmentTransactions) {
			for (let i = 0; i < investmentTransactions.length; i++) {
				const transaction = investmentTransactions[i];
				if (transaction.activity === 'Buy' || transaction.activity === 'MiscExp') {
					balance -= transaction.amount;
				} else if (transaction.activity === 'Sell' || transaction.activity === 'Div') {
					balance += transaction.amount;
				}
			}
		}
	}

	return balance;
};

module.exports = {
	getBalance,
	isInvestmentCashName,
	isInvestmentCash,
	invstAccountNameFor
};