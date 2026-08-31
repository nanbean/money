import { isInternalTransferCategory } from './expense';

// 카테고리 선택 목록의 순서와 계층.
//
// 저장된 categoryList 는 addCategoryAction 에서 기본 .sort() 로 정렬된다. '[' 는
// U+005B, 한글은 U+AC00 부터라서 '[계좌명]' 형태의 이체 카테고리가 전부 앞으로
// 몰린다 — 107개 중 46개가 목록 0~45번을 차지한다. 거래를 입력할 때 흔히 고르는
// 것은 실제 카테고리인데 매번 46칸을 스크롤해야 했다.
//
// 그룹 안의 순서는 손대지 않는다. 한글 구간은 코드 유닛 순서가 이미 가나다순과
// 같다 (localeCompare('ko') 로 다시 정렬해도 차이 0).
//
// 부모 카테고리('세금')는 저장 목록에 없다 — '세금:소득세' 만 있다. 그래서 부모는
// 선택 가능한 행이 아니라 그룹 머리글이다. Reports>Expense 의 상위 합계 행과
// 다른 점이다. 거기서는 부모가 계산된 데이터였다.

export const TRANSFER_GROUP = '계좌 이체 · TRANSFER';

// 자식이 이만큼 있어야 그룹으로 묶는다. '자본 수익:이자' 처럼 자식이 하나면
// 머리글만 한 줄 늘고 접두어는 그대로 남는다 — 얻는 게 없다.
// (Reports>Expense 의 withParentTotals MIN_CHILDREN 과 같은 이유)
export const MIN_GROUP_CHILDREN = 2;

const parentOf = (category) => {
	const idx = category.indexOf(':');
	return idx > 0 ? category.slice(0, idx) : null;
};

export const childLabelOf = (category) => {
	const idx = category.indexOf(':');
	return idx > 0 ? category.slice(idx + 1) : category;
};

export const groupCategories = (categoryList = []) => {
	const categories = [];
	const transfers = [];

	(categoryList || []).forEach((category) => {
		if (!category) return;
		if (isInternalTransferCategory(category)) transfers.push(category);
		else categories.push(category);
	});

	return { categories, transfers };
};

// 평탄한 목록. Autocomplete 의 groupBy 는 옵션이 그룹별로 모여 있어야 한다.
export const orderCategories = (categoryList = []) => {
	const { categories, transfers } = groupCategories(categoryList);
	return [...categories, ...transfers];
};

const parentsWorthGrouping = (categories) => {
	const counts = new Map();
	categories.forEach((category) => {
		const parent = parentOf(category);
		if (parent) counts.set(parent, (counts.get(parent) || 0) + 1);
	});

	const parents = new Set();
	counts.forEach((count, parent) => {
		if (count >= MIN_GROUP_CHILDREN) parents.add(parent);
	});
	return parents;
};

// 메뉴 렌더용 평탄 목록.
//   { kind: 'group', label }                        머리글 — 선택 불가
//   { kind: 'item',  value, label, group, indent }  group 은 소속 머리글 (없으면 null)
//
// group 을 항목에 같이 실어주는 이유는, 네이티브 <optgroup> 처럼 '그룹의 끝' 을
// 알아야 하는 렌더러가 있기 때문이다. 머리글 등장 순서만으로는 그룹이 끝난 뒤의
// 플랫 항목을 직전 그룹에 잘못 넣게 된다.
//
// label 은 화면용으로만 짧다. value 는 항상 '세금:소득세' 전체다 — 저장할 때
// BankTransactionForm 이 ':' 로 쪼개 category/subcategory 로 나눈다.
export const buildCategoryMenu = (categoryList = []) => {
	const { categories, transfers } = groupCategories(categoryList);
	const parents = parentsWorthGrouping(categories);
	const entries = [];
	let openParent = null;

	categories.forEach((category) => {
		const parent = parentOf(category);
		const grouped = !!parent && parents.has(parent);

		if (grouped && parent !== openParent) {
			entries.push({ kind: 'group', label: parent });
			openParent = parent;
		}
		if (!grouped) openParent = null;

		entries.push({
			kind: 'item',
			value: category,
			label: grouped ? childLabelOf(category) : category,
			group: grouped ? parent : null,
			indent: grouped
		});
	});

	if (transfers.length > 0) {
		entries.push({ kind: 'group', label: TRANSFER_GROUP });
		transfers.forEach((value) => {
			// 이체는 접두어가 없으니 라벨을 줄이지 않는다. 들여쓰지도 않는다 —
			// 구분 머리글 하나 아래 46개가 평평하게 놓인다.
			entries.push({ kind: 'item', value, label: value, group: TRANSFER_GROUP, indent: false });
		});
	}

	return entries;
};

// Autocomplete 의 groupBy 용. 그룹이 없는 항목은 빈 문자열을 준다 — renderGroup
// 에서 머리글을 생략한다. 빈 그룹이 목록 중간에 여러 번 나와도 보이는 것은
// 자식뿐이라 문제되지 않는다.
export const makeCategoryGroupBy = (categoryList = []) => {
	const { categories } = groupCategories(categoryList);
	const parents = parentsWorthGrouping(categories);

	return (category) => {
		if (isInternalTransferCategory(category)) return TRANSFER_GROUP;
		const parent = parentOf(category);
		return (parent && parents.has(parent)) ? parent : '';
	};
};
