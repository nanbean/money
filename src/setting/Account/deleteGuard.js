import { isInvestmentCashName } from '../../utils/investmentCash';

// 계좌 삭제의 파급을 미리 계산한다.
//
// deleteAccountAction 은 계좌 문서와 Invst↔_Cash 짝만 지운다. 거래는 그대로
// 남아 고아가 되고, 거기서 집계가 비대칭으로 갈린다 — 순자산은 계좌 목록을
// 순회하므로 잔액이 사라지지만, 지출은 accountId 문자열만 파싱해서(accountTypeOf)
// 계좌 문서 없이도 통과하니 계속 집계된다.
//
// 실측: '토지주택' 한 번 삭제로 순자산에서 ₩17.3억이 사라지고 거래 59건이 고아가
// 된다. Invst 를 지우면 동반 _Cash 까지 문서 2개가 함께 없어진다. 그런데도 확인
// 절차가 없었다.
//
// 그래서 거래가 있으면 아예 막고 closed 로 유도한다. 계좌를 정말 지울 이유는
// 드물고, closed 는 이력과 순자산을 모두 보존한다.

// Invst 를 지우면 동반 _Cash 가, _Cash 를 지우면 부모 Invst 가 함께 지워진다.
// (couchdbAccountActions.deleteAccountAction 의 양방향 연쇄)
export const cascadeAccountOf = (account, accountList = []) => {
	if (!account) return null;
	const list = accountList || [];

	if (account.type === 'Invst' && account.cashAccountId) {
		return list.find(a => a && a._id === account.cashAccountId) || null;
	}
	if (account.type === 'Bank' && isInvestmentCashName(account.name)) {
		return list.find(a => a && a.type === 'Invst' && a.cashAccountId === account._id) || null;
	}
	return null;
};

export const accountDeletePlan = (account, accountList = [], transactions = []) => {
	if (!account || !account._id) {
		return { targets: [], cascade: null, transactionCount: 0, balance: 0, blocked: false };
	}

	const cascade = cascadeAccountOf(account, accountList);
	const targets = cascade ? [account, cascade] : [account];
	const targetIds = new Set(targets.map(a => a._id));

	const transactionCount = (transactions || [])
		.filter(t => t && targetIds.has(t.accountId)).length;
	const balance = targets.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

	return {
		targets,
		cascade,
		transactionCount,
		balance,
		// 거래가 하나라도 남아 있으면 삭제하지 않는다.
		blocked: transactionCount > 0
	};
};
