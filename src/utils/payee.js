// 가맹점 이름 비교용 키. 대소문자·공백·한글 정규화 차이는 같은 가맹점으로 본다 —
// NH 는 'aliexpress'(사용자가 'Aliexpress' 로 고침), Amex 는 'ALIEXPRESS' 로 와서
// Top payees 에 같은 곳이 두 줄로 나왔다. 서버(notification.js 의 payeeKey)도
// 같은 규칙으로 새 거래를 기존 표기에 맞춘다.
export const payeeKey = (payee) => String(payee || '(none)').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

// 같은 키로 묶인 표기 중 보여 줄 이름. 사용자가 고쳐 둔 표기(원래 이름이
// originalPayee 에 남은 거래)를 먼저, 없으면 가장 많이 쓰인 표기.
export const pickPayeeLabel = (transactions) => {
	const score = new Map();
	transactions.forEach((tx) => {
		const name = tx.payee || '(none)';
		score.set(name, (score.get(name) || 0) + 1 + (tx.originalPayee ? 1000 : 0));
	});
	return [...score.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '(none)';
};

// 가맹점 이름 일괄 변경: oldPayee 와 같은 가맹점(payeeKey 기준)인 거래를 newPayee 로
// 바꾼 문서만 돌려준다. 원래 표기는 originalPayee 에 남긴다(이미 있으면 그대로) — 서버가
// 다음 알림부터 이 이름을 기억해 쓴다. excludeId 는 지금 편집 중인 거래(따로 저장된다).
export const renamePayeeDocs = (transactions, oldPayee, newPayee, excludeId) => {
	const key = payeeKey(oldPayee);
	const name = String(newPayee || '').trim();
	if (!name || name === String(oldPayee || '').trim()) return [];
	return (transactions || [])
		.filter(tx => tx && tx._id !== excludeId && tx.payee && payeeKey(tx.payee) === key && tx.payee !== name)
		.map(tx => ({
			...tx,
			originalPayee: tx.originalPayee || tx.payee,
			payee: name
		}));
};
