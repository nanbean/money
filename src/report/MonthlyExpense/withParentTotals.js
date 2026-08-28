// 서브카테고리 뷰에서 상위 카테고리 합계 행을 끼워 넣는다.
//
// '월급&보너스:기타', '월급&보너스:성과급', '월급&보너스:시간외수당' 처럼 서브카테고리가
// 여러 개면 상위 카테고리 총액이 화면에 아예 안 나온다. 카테고리 뷰로 바꾸면 보이지만
// 그때는 서브카테고리 내역이 사라진다.
//
// 정렬은 건드리지 않는다. 각 상위 카테고리의 '첫 자식 바로 앞'에 합계 행을 넣는다.
// 기존 정렬에서 같은 상위 카테고리의 자식들은 이미 인접해 있으므로(수입은 전체
// 알파벳순, 지출은 콜론 있는 행끼리 알파벳순) 이 방식이면 나머지 행이 움직이지 않는다.
const PARENT_SEPARATOR = ':';

// 자식이 하나면 합계가 그 행과 같으므로 넣지 않는다.
const MIN_CHILDREN = 2;

// 합계 행 아래의 자식은 접두어를 떼고 이 마커를 붙인다. 마커가 상위 행과 이어져
// 보이려면 첫 열이 왼쪽 정렬이어야 한다 (MonthlyExpenseGrid 에서 처리).
// 접두어를 떼는 이유는 폭이다 — '월급&보너스:시간외수당' 은 약 168px 로 첫 열
// (패딩 제외 약 134px)을 넘어 잘렸다. 떼면 마커·들여쓰기를 더해도 들어간다.
const CHILD_MARKER = '└ ';

const parentOf = (category) => String(category || '').split(PARENT_SEPARATOR)[0];
const isChildRow = (row) => !!row.category && row.category.includes(PARENT_SEPARATOR);

export const withParentTotals = (report = [], reportView) => {
	// 카테고리 뷰에서는 행 자체가 이미 상위 카테고리 총액이다.
	if (reportView !== 'subcategory') return report;

	const childrenByParent = new Map();
	report.forEach((row) => {
		if (!isChildRow(row)) return;
		const parent = parentOf(row.category);
		if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
		childrenByParent.get(parent).push(row);
	});

	const emitted = new Set();
	const out = [];

	report.forEach((row) => {
		if (!isChildRow(row)) {
			out.push(row);
			return;
		}

		const parent = parentOf(row.category);
		const children = childrenByParent.get(parent) || [];

		// 합계 행이 생기지 않는 자식(서브카테고리가 하나뿐)은 접두어를 떼면 어느 상위
		// 소속인지 알 수 없다. 전체 이름을 그대로 둔다.
		if (children.length < MIN_CHILDREN) {
			out.push(row);
			return;
		}

		if (!emitted.has(parent)) {
			emitted.add(parent);
			const monthCount = children[0].month ? children[0].month.length : 0;
			out.push({
				category: parent,
				// 드릴다운과 셀 스타일이 이 행을 합계로 알아보게 한다.
				isParentTotal: true,
				month: Array.from({ length: monthCount }, (_, idx) =>
					children.reduce((sum, child) => sum + ((child.month && child.month[idx]) || 0), 0)
				),
				sum: children.reduce((sum, child) => sum + (child.sum || 0), 0)
			});
		}

		// category 는 드릴다운 키라 전체 이름을 유지하고, 화면 라벨만 바꾼다.
		out.push({
			...row,
			displayCategory: `${CHILD_MARKER}${row.category.slice(parent.length + PARENT_SEPARATOR.length)}`
		});
	});

	return out;
};

export default withParentTotals;
