// 투자 계좌와 동반 현금 계좌.
//
// 투자 계좌(Invst)는 보유 종목을, 동반 현금 계좌는 결제 대금을 갖는다. 매수는
// 현금 → 증권 이동이라 현금 노드가 있어야 성립한다 (Quicken/QIF 모델). 나눈 것
// 자체는 맞다.
//
// 지저분한 것은 둘을 잇는 열쇠가 계좌 '이름' 이라는 점이다. 현금 계좌 문서는
// 일반 Bank 계좌와 필드가 완전히 같아서, 구분되는 신호가 접미사뿐이다.
//
//   _id, _rev, balance, closed, currency, investments, name, type   ← 양쪽 동일
//
// 그래서 코드 20여 곳이 a.name.match(/_Cash/i) 로 걸러 왔다. 23곳 중 20곳은
// 앵커도 대소문자 구분도 없어서 'MY_CashFlow' 같은 이름이 조용히 투자현금으로
// 취급된다. 그리고 한 곳(utils/expense 의 지출 집계)은 필터를 잊었다 —
// 과거 거래 12건이 지출로 새고 있었다.
//
// Invst 계좌에는 cashAccountId 가 17/17 설정돼 있고 전부 실재하는 문서를
// 가리킨다. 계좌 목록이 있으면 그 링크로 판정하고, 이름만 아는 자리에서는
// 앵커를 맞춘 접미사 규약으로 판정한다.

const CASH_SUFFIX = '_Cash';

// 이름만 아는 자리용. 앵커를 맞추고 대소문자를 구분한다 — addAccountAction 은
// 항상 '_Cash' 로 만든다. 접미사만으로 이루어진 이름('_Cash')은 제외한다.
export const isInvestmentCashName = (name) =>
	typeof name === 'string'
	&& name.length > CASH_SUFFIX.length
	&& name.endsWith(CASH_SUFFIX);

// 거래는 'account:Bank:IRP_Cash' 형태의 accountId 를 외래키로 갖는다.
export const isInvestmentCashAccountId = (accountId) =>
	isInvestmentCashName(String(accountId || '').split(':')[2]);

export const cashAccountNameFor = (invstName) => `${invstName}${CASH_SUFFIX}`;

// 'IRP_Cash' -> 'IRP'
export const invstAccountNameFor = (cashName) =>
	(isInvestmentCashName(cashName) ? cashName.slice(0, -CASH_SUFFIX.length) : null);

// 계좌 목록으로 만든 판정기. cashAccountId 를 역인덱스로 쓴다.
//
// 링크가 없으면 이름 규약으로 되돌아간다. 링크를 놓쳐 분류를 잃는 것이 이름
// 오검지보다 나쁘다 — 투자현금이 일반 Bank 로 취급되면 순자산과 지출이 어긋난다.
export const makeIsInvestmentCash = (accountList = []) => {
	const linkedIds = new Set();

	(accountList || []).forEach((account) => {
		if (account && account.type === 'Invst' && account.cashAccountId) {
			linkedIds.add(account.cashAccountId);
		}
	});

	return (account) => {
		if (!account) return false;
		if (account._id && linkedIds.has(account._id)) return true;
		return isInvestmentCashName(account.name);
	};
};
