import {
	groupCategories,
	orderCategories,
	buildCategoryMenu,
	makeCategoryGroupBy,
	childLabelOf,
	TRANSFER_GROUP,
	MIN_GROUP_CHILDREN
} from './categoryOrder';

// 저장된 categoryList 를 그대로 흉내낸다 — 기본 .sort() 가 '[' (U+005B) 를
// 한글 (U+AC00~) 앞에 놓아서 이체가 목록 맨 위를 차지한다.
const STORED = [
	'[BoA]', '[IRP_Cash]', '[급여계좌]',
	'건축', '경조사-선물',
	'생활용품비:가구', '생활용품비:수리비',
	'선물받음',
	'세금:소득세', '세금:재산세', '세금:주민세',
	'수수료',
	'자본 수익:이자'
];

const items = (menu) => menu.filter(e => e.kind === 'item');
const headers = (menu) => menu.filter(e => e.kind === 'group').map(e => e.label);
const find = (menu, value) => items(menu).find(e => e.value === value);

describe('groupCategories', () => {
	test('이체를 따로 담는다', () => {
		const { categories, transfers } = groupCategories(STORED);
		expect(transfers).toEqual(['[BoA]', '[IRP_Cash]', '[급여계좌]']);
		expect(categories).not.toContain('[BoA]');
		expect(categories).toContain('세금:소득세');
	});

	test('그룹 안의 순서는 원본 그대로', () => {
		const { categories } = groupCategories(['통신비', '가족:자녀용돈', '보험']);
		expect(categories).toEqual(['통신비', '가족:자녀용돈', '보험']);
	});

	test('빈 값과 falsy 항목을 흘려보낸다', () => {
		expect(groupCategories([])).toEqual({ categories: [], transfers: [] });
		expect(groupCategories(undefined)).toEqual({ categories: [], transfers: [] });
		expect(groupCategories(['보험', '', null, undefined])).toEqual({ categories: ['보험'], transfers: [] });
	});

	test('입력 배열을 바꾸지 않는다', () => {
		const input = [...STORED];
		groupCategories(input);
		expect(input).toEqual(STORED);
	});
});

describe('orderCategories', () => {
	// 107개 중 46개가 이체라 앞의 46칸을 스크롤해야 했다.
	test('실제 카테고리가 앞, 이체가 뒤', () => {
		const ordered = orderCategories(STORED);
		expect(ordered.slice(-3)).toEqual(['[BoA]', '[IRP_Cash]', '[급여계좌]']);
		expect(ordered[0]).toBe('건축');
	});

	test('항목을 잃거나 더하지 않는다', () => {
		const ordered = orderCategories(STORED);
		expect([...ordered].sort()).toEqual([...STORED].sort());
	});

	test('이체가 없으면 그대로', () => {
		expect(orderCategories(['보험', '통신비'])).toEqual(['보험', '통신비']);
	});
});

describe('childLabelOf', () => {
	test('콜론 뒤만 남긴다', () => {
		expect(childLabelOf('세금:소득세')).toBe('소득세');
		expect(childLabelOf('취미-레저:여가')).toBe('여가');
	});

	test('부모가 없으면 그대로', () => {
		expect(childLabelOf('통신비')).toBe('통신비');
		expect(childLabelOf('[급여계좌]')).toBe('[급여계좌]');
	});

	// indexOf > 0 이라 맨 앞 콜론은 부모 구분자로 보지 않는다.
	test('맨 앞의 콜론은 부모로 보지 않는다', () => {
		expect(childLabelOf(':이상한값')).toBe(':이상한값');
	});
});

describe('buildCategoryMenu', () => {
	const menu = buildCategoryMenu(STORED);

	test('부모 머리글을 자식 앞에 한 번만 넣는다', () => {
		expect(headers(menu)).toEqual(['생활용품비', '세금', TRANSFER_GROUP]);
	});

	test('값은 전체 경로, 라벨만 짧다', () => {
		const entry = find(menu, '세금:소득세');
		expect(entry.value).toBe('세금:소득세');
		expect(entry.label).toBe('소득세');
		expect(entry.indent).toBe(true);
		expect(entry.group).toBe('세금');
	});

	test('부모가 없는 항목은 라벨 그대로, 들여쓰지 않는다', () => {
		const entry = find(menu, '건축');
		expect(entry).toMatchObject({ value: '건축', label: '건축', indent: false, group: null });
	});

	// 자식이 하나면 머리글만 한 줄 늘고 접두어는 그대로 남는다.
	test(`자식이 ${MIN_GROUP_CHILDREN}개 미만인 부모는 묶지 않는다`, () => {
		expect(headers(menu)).not.toContain('자본 수익');
		expect(find(menu, '자본 수익:이자')).toMatchObject({
			label: '자본 수익:이자',
			indent: false,
			group: null
		});
	});

	test('이체는 구분 머리글 아래에 평평하게, 라벨은 그대로', () => {
		const entry = find(menu, '[급여계좌]');
		expect(entry).toMatchObject({ label: '[급여계좌]', indent: false, group: TRANSFER_GROUP });
	});

	test('이체가 없으면 구분 머리글도 없다', () => {
		expect(headers(buildCategoryMenu(['보험', '통신비']))).toEqual([]);
	});

	test('항목을 잃거나 더하지 않는다', () => {
		expect(items(menu).map(e => e.value).sort()).toEqual([...STORED].sort());
	});

	// optgroup 처럼 '그룹의 끝' 을 알아야 하는 렌더러가 있다. 머리글 등장 순서만
	// 보면 그룹이 끝난 뒤의 플랫 항목('선물받음')을 직전 그룹에 잘못 넣는다.
	test('그룹이 끝난 뒤의 플랫 항목은 그룹에 속하지 않는다', () => {
		expect(find(menu, '선물받음').group).toBeNull();
		expect(find(menu, '수수료').group).toBeNull();
	});

	test('연속 그룹으로 재구성하면 경계가 맞는다', () => {
		const groups = [];
		items(menu).forEach((entry) => {
			const last = groups[groups.length - 1];
			if (last && last.label === entry.group) last.items.push(entry.value);
			else groups.push({ label: entry.group, items: [entry.value] });
		});

		expect(groups.map(g => g.label)).toEqual([
			null, '생활용품비', null, '세금', null, TRANSFER_GROUP
		]);
		expect(groups[2].items).toEqual(['선물받음']);
		expect(groups[4].items).toEqual(['수수료', '자본 수익:이자']);
	});

	test('빈 목록은 빈 메뉴', () => {
		expect(buildCategoryMenu([])).toEqual([]);
		expect(buildCategoryMenu(undefined)).toEqual([]);
	});
});

describe('makeCategoryGroupBy', () => {
	const groupBy = makeCategoryGroupBy(STORED);

	test('묶인 부모를 그룹명으로 준다', () => {
		expect(groupBy('세금:소득세')).toBe('세금');
		expect(groupBy('생활용품비:가구')).toBe('생활용품비');
	});

	test('이체는 구분 그룹', () => {
		expect(groupBy('[급여계좌]')).toBe(TRANSFER_GROUP);
	});

	// Autocomplete 의 renderGroup 은 빈 문자열이면 머리글을 생략한다.
	test('그룹이 없으면 빈 문자열', () => {
		expect(groupBy('건축')).toBe('');
		expect(groupBy('자본 수익:이자')).toBe('');
	});

	test('buildCategoryMenu 의 group 과 일치한다', () => {
		items(buildCategoryMenu(STORED)).forEach((entry) => {
			expect(groupBy(entry.value)).toBe(entry.group || '');
		});
	});

	// groupBy 는 같은 그룹이 붙어 있어야 머리글이 한 번만 나온다. 빈 그룹(플랫
	// 항목)은 목록 중간에 여러 번 나와도 되므로 검사에서 뺀다.
	test('정렬된 목록에서 같은 그룹이 한 덩어리로 모인다', () => {
		const closed = new Set();
		const reopened = [];
		let prev = null;

		orderCategories(STORED).map(groupBy).forEach((group) => {
			if (group === prev) return;
			if (group && closed.has(group)) reopened.push(group);
			if (prev) closed.add(prev);
			prev = group;
		});

		expect(reopened).toEqual([]);
	});
});
