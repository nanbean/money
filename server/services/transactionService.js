const transactionDB = require('../db/transactionDB');
const { updateAccount, updateAccountList } = require('./accountService');

const getAllTransactions = async () => {
	return await transactionDB.getAllTransactions();
};

const addTransaction = async (transaction) => {
	await transactionDB.insertTransaction(transaction);

	// 거래가 바뀐 계좌만 다시 계산한다. accountId 가 없는 옛 호출은 전체로
	// 되돌린다 — 어느 계좌를 고쳐야 할지 모르면 아무것도 안 하는 편보다
	// 전체를 도는 편이 낫다.
	//
	// 방금 넣은 거래를 함께 넘긴다. 로컬 복제본이 changes 피드로 따라오므로
	// 바로 읽으면 빠져 있을 수 있다.
	if (transaction && transaction.accountId) {
		await updateAccount(transaction.accountId, [transaction]);
	} else {
		await updateAccountList();
	}
};

module.exports = {
	getAllTransactions,
	addTransaction
};