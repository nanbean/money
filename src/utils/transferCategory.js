// 계좌 ↔ 이체 카테고리 연결.
//
// 계좌 간 이체는 '[계좌명]' 형태의 카테고리로 기록된다. 지금까지 이 카테고리를
// 손으로 추가해야 했고, 그래서 RobinhoodMargin_Cash 처럼 계좌는 있는데 이체
// 카테고리가 없는 계좌가 생겼다 — 그 계좌로는 이체를 기록할 수 없다.

export const transferCategoryName = (accountName) => `[${accountName}]`;

// Invst 는 보유 종목 계좌다. 현금은 addAccountAction 이 함께 만드는 '<name>_Cash'
// (Bank) 에 있고 이체는 그쪽으로 간다. 실제 설정도 Invst 17개 전부 이체
// 카테고리가 없고 _Cash 쪽만 있다 — 규칙을 새로 정하는 게 아니라 이미 있는
// 규칙을 코드로 옮기는 것이다.
export const transferCategoryFor = (account) => {
	if (!account || !account.name || account.type === 'Invst') return null;
	return transferCategoryName(account.name);
};

// 새로 만들어진 계좌들에 대해 아직 없는 이체 카테고리만 골라낸다.
//
// 이미 있는 것을 걸러내는 게 중요하다. 계좌를 지워도 이체 카테고리는 남는데
// (과거 거래가 그 이름을 참조한다 — 현재 고아 13건), 같은 이름으로 계좌를 다시
// 만들면 중복 항목이 생겨 모든 드롭다운에 두 번 나온다.
export const missingTransferCategories = (accounts = [], categoryList = []) => {
	const existing = new Set(categoryList || []);
	const missing = [];

	(accounts || []).forEach((account) => {
		const name = transferCategoryFor(account);
		if (!name || existing.has(name)) return;
		existing.add(name);
		missing.push(name);
	});

	return missing;
};
