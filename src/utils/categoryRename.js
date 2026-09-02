// 카테고리 이름 변경·삭제의 파급 계산과 실제 이전.
//
// categoryList 는 '식비:군것질' 처럼 부모:자식을 한 문자열로 담지만, 거래는
// category / subcategory 두 필드로 나눠 갖는다. 분할(division) 항목도 같은 두
// 필드를 갖는다 (실측: 분할 항목 2,876개 중 2,270개에 subcategory 있음).
//
// 예전 updateCategoryAction 은 목록의 문자열만 바꿨다. 거래는 그대로 남으니
// 이름 변경이 아니라 이력 분기였다 — '식비:군것질' 을 바꾸면 거래 4,023건이
// 목록에 없는 이름에 남고, 리포트는 거래에서 카테고리를 뽑으므로 옛 이름과 새
// 이름이 나란히 뜬다. 실제로 그 흔적이 있다 ('자본 수익:배당' 5건, '식비' 2건).

export const splitCategory = (full) => {
	const text = String(full || '');
	const idx = text.indexOf(':');
	return idx > 0
		? { category: text.slice(0, idx), subcategory: text.slice(idx + 1) }
		: { category: text, subcategory: '' };
};

export const joinCategory = (category, subcategory) =>
	(subcategory ? `${category}:${subcategory}` : String(category || ''));

const matches = (holder, target) =>
	!!holder
	&& holder.category === target.category
	&& (holder.subcategory || '') === target.subcategory;

// 거래 하나를 옮긴다. 바뀐 게 없으면 null — 호출하는 쪽이 bulkDocs 에 넣을
// 문서만 고르게 한다.
export const renameInTransaction = (transaction, oldFull, newFull) => {
	if (!transaction) return null;
	const from = splitCategory(oldFull);
	const to = splitCategory(newFull);

	let changed = false;
	const next = { ...transaction };

	if (matches(transaction, from)) {
		next.category = to.category;
		next.subcategory = to.subcategory;
		changed = true;
	}

	if (Array.isArray(transaction.division) && transaction.division.length > 0) {
		let divisionChanged = false;
		const division = transaction.division.map((item) => {
			if (!matches(item, from)) return item;
			divisionChanged = true;
			return { ...item, category: to.category, subcategory: to.subcategory };
		});
		if (divisionChanged) {
			next.division = division;
			changed = true;
		}
	}

	return changed ? next : null;
};

// 정기지불도 같은 두 필드를 갖는다. 이름을 바꿔도 옮겨지지 않아서 죽은 이름을
// 가리키게 됐다 ('통신비' 에 4건 걸려 있다).
export const renameInPayment = (payment, oldFull, newFull) => {
	if (!payment) return null;
	const from = splitCategory(oldFull);
	if (!matches(payment, from)) return null;

	const to = splitCategory(newFull);
	return { ...payment, category: to.category, subcategory: to.subcategory };
};

// 이 이름을 참조하는 거래 수. 분할 항목이 여럿 걸린 거래는 한 번만 센다 —
// 사용자에게는 '옮겨질 거래 건수' 가 의미 있는 단위다.
export const countTransactionRefs = (transactions = [], full) => {
	const from = splitCategory(full);
	if (!from.category) return 0;

	return (transactions || []).filter((transaction) => {
		if (!transaction) return false;
		if (matches(transaction, from)) return true;
		return (transaction.division || []).some((item) => matches(item, from));
	}).length;
};

export const countPaymentRefs = (payments = [], full) => {
	const from = splitCategory(full);
	if (!from.category) return 0;
	return (payments || []).filter((payment) => matches(payment, from)).length;
};

// 삭제·이름변경 전에 보여줄 요약.
export const categoryImpact = (full, transactions = [], payments = []) => ({
	transactionCount: countTransactionRefs(transactions, full),
	paymentCount: countPaymentRefs(payments, full)
});
