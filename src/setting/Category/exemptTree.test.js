import { coversPath, exemptStateOf, groupExemptSummary, collapseToParent, toggleExempt, buildCategoryRows } from './exemptTree';

// 실제 설정의 모양. '세금' 자식 9개가 전부 개별 등재돼 있다.
const TAX_CHILDREN = [
	'세금:건강보험', '세금:고용보험', '세금:공무원연금', '세금:국민연금',
	'세금:기타세금', '세금:소득세', '세금:재산세', '세금:주민세', '세금:취등록세'
];
const EXEMPT = ['가족:증여', '건축', '대출이자', '보험', ...TAX_CHILDREN];

describe('coversPath', () => {
	test('자신과 자식만 덮는다', () => {
		expect(coversPath('세금', '세금')).toBe(true);
		expect(coversPath('세금', '세금:소득세')).toBe(true);
	});

	// 순수 startsWith 였을 때는 '보험' 이 '보험료' 까지 덮었다.
	test('접두어만 겹치는 이름은 덮지 않는다', () => {
		expect(coversPath('보험', '보험료')).toBe(false);
		expect(coversPath('세금', '세금가산')).toBe(false);
	});

	test('자식이 부모를 덮지는 않는다', () => {
		expect(coversPath('세금:소득세', '세금')).toBe(false);
	});

	test('빈 값은 false', () => {
		expect(coversPath('', '세금')).toBe(false);
		expect(coversPath('세금', '')).toBe(false);
		expect(coversPath(undefined, undefined)).toBe(false);
	});
});

describe('exemptStateOf', () => {
	test('이름 자체가 목록에 있으면 own', () => {
		expect(exemptStateOf('보험', EXEMPT)).toBe('own');
		expect(exemptStateOf('세금:소득세', EXEMPT)).toBe('own');
	});

	test('목록에 없으면 none', () => {
		expect(exemptStateOf('통신비', EXEMPT)).toBe('none');
		expect(exemptStateOf('가족:자녀용돈', EXEMPT)).toBe('none');
	});

	// 이게 표시/동작 불일치의 자리다. 예전 UI 는 자기 이름이 목록에 없으면
	// 'Include' 로 보여줬지만 집계에서는 부모가 덮어서 면제였다.
	test('부모가 목록에 있으면 inherited', () => {
		const list = ['세금'];
		expect(exemptStateOf('세금:소득세', list)).toBe('inherited');
		expect(exemptStateOf('세금', list)).toBe('own');
	});

	test('부모와 자식이 둘 다 있으면 own 이 이긴다', () => {
		expect(exemptStateOf('세금:소득세', ['세금', '세금:소득세'])).toBe('own');
	});

	test('빈 목록이면 전부 none', () => {
		expect(exemptStateOf('보험', [])).toBe('none');
		expect(exemptStateOf('보험', undefined)).toBe('none');
		expect(exemptStateOf('', EXEMPT)).toBe('none');
	});
});

describe('groupExemptSummary', () => {
	test('자식 전원이 개별 등재면 접을 수 있다', () => {
		expect(groupExemptSummary('세금', TAX_CHILDREN, EXEMPT)).toEqual({
			parentExempt: false,
			ownCount: 9,
			total: 9,
			collapsible: true
		});
	});

	test('일부만 등재면 접지 않는다', () => {
		const summary = groupExemptSummary('가족', ['가족:자녀용돈', '가족:증여', '가족:효도비'], EXEMPT);
		expect(summary).toMatchObject({ parentExempt: false, ownCount: 1, total: 3, collapsible: false });
	});

	// 이미 접혀 있으면 다시 접자고 권할 이유가 없다.
	test('부모가 이미 면제면 접을 수 없다', () => {
		expect(groupExemptSummary('세금', TAX_CHILDREN, ['세금'])).toMatchObject({
			parentExempt: true,
			ownCount: 0,
			collapsible: false
		});
	});

	test('자식이 없으면 접을 수 없다', () => {
		expect(groupExemptSummary('세금', [], EXEMPT)).toMatchObject({ total: 0, collapsible: false });
	});

	test('면제가 하나도 없으면 접을 수 없다', () => {
		expect(groupExemptSummary('세금', TAX_CHILDREN, [])).toMatchObject({ ownCount: 0, collapsible: false });
	});
});

describe('collapseToParent', () => {
	test('자식 등재를 지우고 부모 한 줄로 바꾼다', () => {
		const next = collapseToParent('세금', TAX_CHILDREN, EXEMPT);

		expect(next).toContain('세금');
		TAX_CHILDREN.forEach(child => expect(next).not.toContain(child));
		// 9줄이 1줄로 — 18건에서 10건이 된다.
		expect(next).toHaveLength(EXEMPT.length - 9 + 1);
	});

	test('다른 그룹의 면제는 건드리지 않는다', () => {
		const next = collapseToParent('세금', TAX_CHILDREN, EXEMPT);
		expect(next).toEqual(expect.arrayContaining(['가족:증여', '건축', '대출이자', '보험']));
	});

	test('결과를 정렬해 둔다', () => {
		const next = collapseToParent('세금', TAX_CHILDREN, EXEMPT);
		expect(next).toEqual([...next].sort());
	});

	// 부모와 자식이 함께 남으면 자식을 해제해도 부모가 계속 덮어서 화면이 거짓말을 한다.
	test('부모가 이미 있어도 중복으로 넣지 않는다', () => {
		const next = collapseToParent('세금', TAX_CHILDREN, ['세금', ...TAX_CHILDREN]);
		expect(next).toEqual(['세금']);
	});

	test('입력 배열을 바꾸지 않는다', () => {
		const input = [...EXEMPT];
		collapseToParent('세금', TAX_CHILDREN, input);
		expect(input).toEqual(EXEMPT);
	});
});

describe('toggleExempt', () => {
	test('없으면 넣고 정렬한다', () => {
		const next = toggleExempt('통신비', ['보험', '건축']);
		expect(next).toEqual(['건축', '보험', '통신비']);
	});

	test('있으면 뺀다', () => {
		expect(toggleExempt('보험', ['건축', '보험'])).toEqual(['건축']);
	});

	test('빈 목록에서도 동작한다', () => {
		expect(toggleExempt('보험', [])).toEqual(['보험']);
		expect(toggleExempt('보험', undefined)).toEqual(['보험']);
	});

	test('입력 배열을 바꾸지 않는다', () => {
		const input = ['건축', '보험'];
		toggleExempt('보험', input);
		expect(input).toEqual(['건축', '보험']);
	});
});

describe('buildCategoryRows', () => {
	// 부모 그룹 · 그룹 뒤의 플랫 항목 · 이체가 모두 섞인 모양.
	const CATS = [
		'[BoA]', '[급여계좌]',
		'건축',
		'생활용품비:가구', '생활용품비:수리비',
		'선물받음',
		'세금:소득세', '세금:재산세',
		'수수료'
	];
	const shape = (rows) => rows.map(r => (r.kind === 'group' ? `# ${r.label}` : r.name));

	test('부모 그룹으로 접고 이체를 맨 뒤로 보낸다', () => {
		expect(shape(buildCategoryRows(CATS, 'all', []))).toEqual([
			'건축',
			'# 생활용품비', '생활용품비:가구', '생활용품비:수리비',
			'선물받음',
			'# 세금', '세금:소득세', '세금:재산세',
			'수수료',
			`# ${'계좌 이체 · TRANSFER'}`, '[BoA]', '[급여계좌]'
		]);
	});

	test('편집에 쓸 categoryList 인덱스를 붙인다', () => {
		const rows = buildCategoryRows(CATS, 'all', []);
		rows.filter(r => r.kind === 'item').forEach((row) => {
			expect(CATS[row.idx]).toBe(row.name);
		});
	});

	test('머리글에 자식 목록을 담아 접기 동작에 쓴다', () => {
		const header = buildCategoryRows(CATS, 'all', []).find(r => r.label === '세금');
		expect(header.children).toEqual(['세금:소득세', '세금:재산세']);
	});

	test('Exempt 필터는 면제된 항목만 남긴다', () => {
		expect(shape(buildCategoryRows(CATS, 'exempt', ['건축', '세금:소득세'])))
			.toEqual(['건축', '# 세금', '세금:소득세']);
	});

	// 부모 한 줄로 면제된 자식이 필터에서 사라지면 안 된다.
	test('Exempt 필터가 상속된 자식도 남긴다', () => {
		expect(shape(buildCategoryRows(CATS, 'exempt', ['세금'])))
			.toEqual(['# 세금', '세금:소득세', '세금:재산세']);
	});

	// 다음 행이 항목인지만 보면 '세금' 머리글이 뒤따르는 플랫 항목('수수료')을
	// 자기 자식으로 오인해 살아남는다.
	test('자식이 전부 걸러진 머리글은 남기지 않는다', () => {
		expect(shape(buildCategoryRows(CATS, 'exempt', ['수수료']))).toEqual(['수수료']);
	});

	test('마지막 그룹의 자식이 전부 걸러져도 머리글이 남지 않는다', () => {
		expect(shape(buildCategoryRows(CATS, 'exempt', ['건축']))).toEqual(['건축']);
	});

	test('면제가 없으면 빈 목록', () => {
		expect(buildCategoryRows(CATS, 'exempt', [])).toEqual([]);
	});

	test('빈 입력은 빈 목록', () => {
		expect(buildCategoryRows([], 'all', [])).toEqual([]);
		expect(buildCategoryRows(undefined, 'all', undefined)).toEqual([]);
	});
});
