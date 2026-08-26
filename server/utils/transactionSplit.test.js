const { flattenSplitTransactions, isInternalTransferCategory } = require('./transactionSplit');

const tx = (overrides = {}) => ({
	_id: 't1',
	accountId: 'account:Bank:급여계좌',
	date: '2026-08-14',
	category: '식비',
	amount: -10000,
	...overrides
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

describe('flattenSplitTransactions', () => {
	test('분할이 없는 거래는 원본 객체를 그대로 낸다', () => {
		const single = tx();
		const rows = flattenSplitTransactions([single]);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toBe(single);
	});

	// 부모 amount 는 하위 합계(순액)라 부모만 세면 공제 지출이 사라진다.
	test('급여 분할을 수입/지출 항목으로 모두 펼친다', () => {
		// 하위 합계: 수입 6,402,220 + 지출 -522,440 = 5,879,780
		const payroll = tx({
			category: '월급&보너스',
			amount: 5879780,
			division: [
				{ category: '월급&보너스', subcategory: '월급', description: '월급', amount: 5415960 },
				{ category: '월급&보너스', subcategory: '기타', description: '수당', amount: 986260 },
				{ category: '세금', subcategory: '소득세', description: '소득세', amount: -422860 },
				{ category: '식비', subcategory: '외식', description: '급식비', amount: -69580 },
				{ category: '회비', description: '교직원공제회비', amount: -30000 }
			]
		});

		const rows = flattenSplitTransactions([payroll]);

		expect(rows).toHaveLength(5);
		// 부모는 결과에 포함되지 않는다 (이중 계산 방지)
		expect(rows.some(r => r.amount === 5879780)).toBe(false);
		// 하위 합계 == 부모 금액
		expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(5879780);

		const income = rows.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0);
		const expense = rows.filter(r => r.amount < 0).reduce((s, r) => s + r.amount, 0);
		expect(income).toBe(6402220);
		expect(expense).toBe(-522440);
		// 순액은 부모와 같아야 한다 — saved 계산이 이 성질에 의존한다
		expect(income + expense).toBe(5879780);
	});

	test('부모의 계좌·날짜를 하위 항목에 물려준다', () => {
		const rows = flattenSplitTransactions([
			tx({ division: [{ category: '식비', description: '점심', amount: -8000 }] })
		]);
		expect(rows[0]).toMatchObject({
			_id: 't1',
			accountId: 'account:Bank:급여계좌',
			date: '2026-08-14',
			category: '식비',
			payee: '점심',
			amount: -8000,
			fromDivision: true
		});
	});

	test('분할 안의 계좌간 이체는 제외한다', () => {
		const rows = flattenSplitTransactions([
			tx({
				division: [
					{ category: '[KB증권]', description: '이체', amount: -100000 },
					{ category: '식비', description: '점심', amount: -8000 }
				]
			})
		]);
		expect(rows).toHaveLength(1);
		expect(rows[0].category).toBe('식비');
	});

	test('금액이 0이거나 없는 분할 항목은 버린다', () => {
		const rows = flattenSplitTransactions([
			tx({
				division: [
					{ category: '식비', description: '0원', amount: 0 },
					{ category: '식비', description: '누락' },
					{ category: '식비', description: '정상', amount: -100 }
				]
			})
		]);
		expect(rows).toHaveLength(1);
		expect(rows[0].amount).toBe(-100);
	});

	test('빈 division 은 부모 거래로 취급한다', () => {
		const rows = flattenSplitTransactions([tx({ division: [] })]);
		expect(rows).toHaveLength(1);
		expect(rows[0].amount).toBe(-10000);
	});

	test('빈 입력과 falsy 항목을 견딘다', () => {
		expect(flattenSplitTransactions()).toEqual([]);
		expect(flattenSplitTransactions([])).toEqual([]);
		expect(flattenSplitTransactions([null, undefined])).toEqual([]);
	});

	test('분할과 일반 거래가 섞여 있어도 순서를 유지한다', () => {
		const rows = flattenSplitTransactions([
			tx({ _id: 'a', amount: -1000 }),
			tx({ _id: 'b', division: [{ category: '식비', description: 'x', amount: -2000 }] }),
			tx({ _id: 'c', amount: -3000 })
		]);
		expect(rows.map(r => r._id)).toEqual(['a', 'b', 'c']);
	});
});
