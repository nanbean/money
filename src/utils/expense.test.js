import {
	EXPENSE_ACCOUNT_TYPES,
	accountTypeOf,
	fullCategoryOf,
	isInternalTransferCategory,
	flattenExpenseRows,
	isLivingExpenseExempt
} from './expense';

const tx = (overrides = {}) => ({
	_id: 't1',
	accountId: 'account:CCard:생활비카드',
	account: '생활비카드',
	date: '2026-08-11',
	category: '식비',
	amount: -10000,
	...overrides
});

describe('accountTypeOf', () => {
	test('accountId 의 두 번째 조각을 돌려준다', () => {
		expect(accountTypeOf({ accountId: 'account:CCard:생활비카드' })).toBe('CCard');
		expect(accountTypeOf({ accountId: 'account:Invst:KB증권' })).toBe('Invst');
	});

	test('accountId 가 없으면 null', () => {
		expect(accountTypeOf({})).toBeNull();
		expect(accountTypeOf(null)).toBeNull();
	});
});

describe('fullCategoryOf', () => {
	test('서브카테고리가 있으면 콜론으로 이어 붙인다', () => {
		expect(fullCategoryOf({ category: '세금', subcategory: '소득세' })).toBe('세금:소득세');
	});

	test('서브카테고리가 없으면 카테고리만', () => {
		expect(fullCategoryOf({ category: '식비' })).toBe('식비');
	});
});

describe('isInternalTransferCategory', () => {
	test.each([
		['[KB증권]', true],
		['[급여계좌]', true],
		['식비', false],
		['[미완성', false],
		['', false],
		[undefined, false]
	])('%p → %s', (category, expected) => {
		expect(isInternalTransferCategory(category)).toBe(expected);
	});
});

describe('flattenExpenseRows', () => {
	test('지출 계좌 종류만 남긴다', () => {
		expect(EXPENSE_ACCOUNT_TYPES).toEqual(['Bank', 'CCard', 'Cash']);
		const rows = flattenExpenseRows([
			tx({ accountId: 'account:Invst:KB증권' }),
			tx({ accountId: 'account:Oth:자산' }),
			tx({ accountId: 'account:Bank:급여계좌' })
		]);
		expect(rows).toHaveLength(1);
		expect(rows[0].accountId).toBe('account:Bank:급여계좌');
	});

	test('수입(양수)과 계좌간 이체는 제외한다', () => {
		const rows = flattenExpenseRows([
			tx({ amount: 5000 }),
			tx({ amount: 0 }),
			tx({ category: '[KB증권]' }),
			tx()
		]);
		expect(rows).toHaveLength(1);
		expect(rows[0].amount).toBe(-10000);
	});

	test('분할이 없는 거래는 원본 객체를 그대로 낸다', () => {
		const single = tx();
		expect(flattenExpenseRows([single])[0]).toBe(single);
	});

	// 이 동작이 없어서 Spending 과 Reports 의 같은 달 합계가 어긋나 있었다.
	// 급여는 부모 금액이 양수라 부호만 보면 통째로 탈락하고, 그 안에 원천 공제된
	// 급식비·통신비·회비 같은 지출이 함께 사라진다.
	test('부모가 양수인 급여 거래의 분할 지출도 빠짐없이 낸다', () => {
		const payroll = tx({
			_id: 'payroll',
			accountId: 'account:Bank:급여계좌',
			account: '급여계좌',
			date: '2026-08-14',
			category: '',
			amount: 3000000,
			division: [
				{ category: '급여', description: '본봉', amount: 4000000 },
				{ category: '식비', subcategory: '외식', description: '급식비', amount: -69580 },
				{ category: '통신비', description: 'SKT', amount: -38260 },
				{ category: '회비', description: '교직원공제회비', amount: -30000 }
			]
		});

		const rows = flattenExpenseRows([payroll]);

		expect(rows).toHaveLength(3);
		expect(rows.map(r => r.payee)).toEqual(['급식비', 'SKT', '교직원공제회비']);
		expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(-137840);
		// 부모의 계좌 정보를 물려받아야 통화 환산과 리포트 그룹화가 동작한다
		rows.forEach(r => {
			expect(r.accountId).toBe('account:Bank:급여계좌');
			expect(r.account).toBe('급여계좌');
			expect(r.date).toBe('2026-08-14');
			expect(r.fromDivision).toBe(true);
		});
	});

	test('분할이 있으면 부모 금액은 계산에 넣지 않는다', () => {
		const rows = flattenExpenseRows([
			tx({ amount: -500000, division: [{ category: '식비', description: '점심', amount: -1000 }] })
		]);
		expect(rows).toHaveLength(1);
		expect(rows[0].amount).toBe(-1000);
	});

	test('분할 안의 수입·이체·대출원금은 제외한다', () => {
		const rows = flattenExpenseRows([
			tx({
				division: [
					{ category: '급여', description: '본봉', amount: 1000 },
					{ category: '[KB증권]', description: '이체', amount: -2000 },
					{ category: '대출이자', payee: 'Principal', description: '원금', amount: -3000 },
					{ category: '대출이자', payee: 'Interest', description: '이자', amount: -4000 }
				]
			})
		]);
		expect(rows).toHaveLength(1);
		expect(rows[0].amount).toBe(-4000);
		expect(rows[0].payee).toBe('이자');
	});

	test('빈 입력과 falsy 항목을 견딘다', () => {
		expect(flattenExpenseRows()).toEqual([]);
		expect(flattenExpenseRows([])).toEqual([]);
		expect(flattenExpenseRows([null, undefined])).toEqual([]);
	});

	test('빈 division 배열은 부모 거래로 취급한다', () => {
		const rows = flattenExpenseRows([tx({ division: [] })]);
		expect(rows).toHaveLength(1);
		expect(rows[0].amount).toBe(-10000);
	});
});

describe('isLivingExpenseExempt', () => {
	// 실제 설정값은 대부분 서브카테고리까지 지정돼 있다. 카테고리만으로 비교하면
	// 이 항목들이 하나도 걸러지지 않아 리포트 뷰에 따라 합계가 달라졌다.
	const exempt = ['세금:소득세', '세금:건강보험', '보험', '취미-레저:여행', '대출이자'];

	test('서브카테고리까지 일치해야 면제된다', () => {
		expect(isLivingExpenseExempt({ category: '세금', subcategory: '소득세' }, exempt)).toBe(true);
		expect(isLivingExpenseExempt({ category: '세금', subcategory: '자동차세' }, exempt)).toBe(false);
	});

	test('카테고리만 지정된 항목은 카테고리로 면제된다', () => {
		expect(isLivingExpenseExempt({ category: '보험' }, exempt)).toBe(true);
		expect(isLivingExpenseExempt({ category: '보험', subcategory: '자동차보험' }, exempt)).toBe(true);
	});

	test('면제 대상이 아니면 false', () => {
		expect(isLivingExpenseExempt({ category: '식비', subcategory: '외식' }, exempt)).toBe(false);
	});

	test('카테고리가 없으면 false', () => {
		expect(isLivingExpenseExempt({}, exempt)).toBe(false);
		expect(isLivingExpenseExempt({ category: '' }, exempt)).toBe(false);
	});

	test('면제 목록이 비면 아무것도 면제되지 않는다', () => {
		expect(isLivingExpenseExempt({ category: '세금', subcategory: '소득세' })).toBe(false);
		expect(isLivingExpenseExempt({ category: '보험' }, [])).toBe(false);
	});
});
