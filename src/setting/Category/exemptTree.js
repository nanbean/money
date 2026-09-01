import { buildCategoryMenu } from '../../utils/categoryOrder';

// 생활비 면제(livingExpenseExempt)의 계층 처리.
//
// 면제 목록은 categoryList 의 부분집합이 아니다. 부모('세금')는 categoryList 에
// 없고 '세금:소득세' 만 있는데, 면제는 부모 이름 한 줄로 자식 전체를 덮을 수 있다.
// 실제 설정에는 '세금' 의 자식 9개가 전부 개별 등재돼 있다 — 18건 중 절반이다.
//
// 부모로 덮으면 화면과 동작이 어긋날 수 있다. 자식 행은 목록에 자기 이름이 없으니
// '포함'으로 보이는데 집계에서는 면제된다. 그래서 행마다 own / inherited / none 을
// 구분해 'inherited' 는 읽기 전용으로 보여준다.

// 경로 단위 판정. 'X' 는 X 자신과 'X:...' 만 덮는다.
//
// utils/expense 의 isLivingExpenseExempt 는 순수 문자열 startsWith 였다. 지금
// 데이터에서는 결과가 같지만('건축'·'보험'·'대출이자' 로 시작하는 다른 카테고리가
// 없다), '보험' 이 '보험료' 를 덮는 식으로 언제든 어긋날 수 있다.
export const coversPath = (exempt, name) =>
	!!exempt && !!name && (name === exempt || name.startsWith(`${exempt}:`));

// 'own'       이름 자체가 면제 목록에 있다
// 'inherited' 부모가 덮고 있다 — 개별 해제가 불가능하다
// 'none'
export const exemptStateOf = (name, exemptList = []) => {
	if (!name) return 'none';
	const list = exemptList || [];
	if (list.includes(name)) return 'own';
	return list.some(exempt => exempt !== name && coversPath(exempt, name)) ? 'inherited' : 'none';
};

export const groupExemptSummary = (parent, children = [], exemptList = []) => {
	const list = exemptList || [];
	const ownCount = children.filter(child => list.includes(child)).length;
	const parentExempt = list.includes(parent);

	return {
		parentExempt,
		ownCount,
		total: children.length,
		// 자식 전원이 개별 등재면 부모 한 줄로 접을 수 있다.
		collapsible: !parentExempt && children.length > 0 && ownCount === children.length
	};
};

// 부모를 면제로 만들 때 자식 개별 등재를 함께 지운다. 같은 뜻이 두 군데 남으면
// 자식 하나를 해제해도 부모가 계속 덮어서 화면이 거짓말을 한다.
export const collapseToParent = (parent, children = [], exemptList = []) => {
	const kept = (exemptList || []).filter(
		exempt => exempt !== parent && !children.includes(exempt)
	);
	return [...kept, parent].sort();
};

export const toggleExempt = (name, exemptList = []) => {
	const list = exemptList || [];
	return list.includes(name)
		? list.filter(exempt => exempt !== name)
		: [...list, name].sort();
};

// 화면에 그릴 행 목록. 거래 입력 드롭다운과 같은 규칙으로 부모 그룹 아래에 접고,
// 편집/삭제에 필요한 categoryList 인덱스를 항목에 붙인다.
//
// filter === 'exempt' 는 면제된 항목만 남긴다 — 상속까지 포함해야 부모 한 줄로
// 면제된 자식이 필터에서 사라지지 않는다.
export const buildCategoryRows = (categoryList = [], filter = 'all', exemptList = []) => {
	const indexByName = new Map();
	(categoryList || []).forEach((name, idx) => {
		if (!indexByName.has(name)) indexByName.set(name, idx);
	});

	const menu = buildCategoryMenu(categoryList);

	// 머리글의 면제 요약과 '부모로 접기' 에 쓸 자식 목록.
	const childrenOf = new Map();
	menu.forEach((entry) => {
		if (entry.kind !== 'item' || !entry.group) return;
		if (!childrenOf.has(entry.group)) childrenOf.set(entry.group, []);
		childrenOf.get(entry.group).push(entry.value);
	});

	const built = menu.map((entry) => (entry.kind === 'group'
		? { ...entry, children: childrenOf.get(entry.label) || [] }
		: { ...entry, name: entry.value, idx: indexByName.get(entry.value) }));

	const visible = built.filter((entry) => entry.kind === 'group'
		|| filter !== 'exempt'
		|| exemptStateOf(entry.name, exemptList) !== 'none');

	// 자식이 전부 걸러진 머리글은 남기지 않는다. 다음 행이 항목인지만 보면 안 된다
	// — 그 항목이 이 그룹의 자식이 아닐 수 있다(뒤따르는 플랫 항목).
	return visible.filter((entry, i) => {
		if (entry.kind !== 'group') return true;
		const next = visible[i + 1];
		return !!next && next.kind === 'item' && next.group === entry.label;
	});
};
