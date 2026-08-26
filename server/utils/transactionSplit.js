// 분할(division) 거래를 하위 항목으로 펼친다.
//
// 부모 amount 는 하위 항목 합계와 같다(순액). 그래서 부모만 세면 총액은 맞지만
// 급여처럼 수입과 공제가 섞인 거래에서 원천 공제된 지출(세금·보험·급식비·통신비 등)이
// 아예 보이지 않고, 수입도 총액이 아니라 순액으로 잡힌다. 실측 예:
//   부모 4,085,150 = 하위 수입 6,402,220 + 하위 지출 -2,317,070
//
// 클라이언트에도 같은 목적의 유틸이 있다(src/utils/expense.js). 그쪽은 지출 전용이고
// 계좌 종류까지 걸러내지만, 여기서는 수입·지출을 함께 다루고 호출하는 쪽이 자기 기준으로
// 필터링하도록 펼치는 일만 한다.
const isInternalTransferCategory = (category) =>
	!!category && category.startsWith('[') && category.endsWith(']');

const flattenSplitTransactions = (transactions = []) => {
	const rows = [];

	(transactions || []).forEach((tx) => {
		if (!tx) return;

		if (tx.division && tx.division.length > 0) {
			tx.division.forEach((item) => {
				if (!item || !item.amount) return;
				if (isInternalTransferCategory(item.category)) return;

				rows.push({
					_id: tx._id,
					accountId: tx.accountId,
					date: tx.date,
					category: item.category,
					subcategory: item.subcategory,
					// 분할 항목의 표시용 이름은 description 에 들어 있다.
					payee: item.description,
					amount: item.amount,
					fromDivision: true
				});
			});
			return;
		}

		rows.push(tx);
	});

	return rows;
};

module.exports = { flattenSplitTransactions, isInternalTransferCategory };
