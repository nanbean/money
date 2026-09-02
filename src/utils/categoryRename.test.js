import {
	splitCategory,
	joinCategory,
	renameInTransaction,
	renameInPayment,
	countTransactionRefs,
	countPaymentRefs,
	categoryImpact
} from './categoryRename';

const tx = (over = {}) => ({ _id: 'tx1', date: '2026-01-01', amount: -1000, ...over });

describe('splitCategory', () => {
	test('부모와 자식으로 나눈다', () => {
		expect(splitCategory('식비:군것질')).toEqual({ category: '식비', subcategory: '군것질' });
	});

	test('자식이 없으면 subcategory 는 빈 문자열', () => {
		expect(splitCategory('통신비')).toEqual({ category: '통신비', subcategory: '' });
	});

	// 이체 카테고리는 대괄호 안에 콜론이 없다.
	test('이체 카테고리는 통째로 category', () => {
		expect(splitCategory('[급여계좌]')).toEqual({ category: '[급여계좌]', subcategory: '' });
	});

	// indexOf > 0 이라 맨 앞 콜론은 구분자로 보지 않는다.
	test('맨 앞 콜론은 나누지 않는다', () => {
		expect(splitCategory(':이상')).toEqual({ category: ':이상', subcategory: '' });
	});

	test('첫 콜론에서만 나눈다', () => {
		expect(splitCategory('a:b:c')).toEqual({ category: 'a', subcategory: 'b:c' });
	});

	test('빈 값', () => {
		expect(splitCategory(undefined)).toEqual({ category: '', subcategory: '' });
		expect(splitCategory('')).toEqual({ category: '', subcategory: '' });
	});
});

describe('joinCategory', () => {
	test('왕복한다', () => {
		expect(joinCategory('식비', '군것질')).toBe('식비:군것질');
		expect(joinCategory('통신비', '')).toBe('통신비');
		expect(joinCategory('통신비', undefined)).toBe('통신비');
	});
});

describe('renameInTransaction', () => {
	test('최상위 카테고리를 옮긴다', () => {
		const next = renameInTransaction(tx({ category: '식비', subcategory: '군것질' }), '식비:군것질', '식비:간식');

		expect(next).toMatchObject({ category: '식비', subcategory: '간식' });
	});

	test('부모까지 바뀌는 경우도 옮긴다', () => {
		const next = renameInTransaction(tx({ category: '식비', subcategory: '군것질' }), '식비:군것질', '간식비:과자');

		expect(next).toMatchObject({ category: '간식비', subcategory: '과자' });
	});

	test('자식 없는 이름을 자식 있는 이름으로', () => {
		const next = renameInTransaction(tx({ category: '통신비' }), '통신비', '통신비:휴대폰');

		expect(next).toMatchObject({ category: '통신비', subcategory: '휴대폰' });
	});

	test('자식 있는 이름을 자식 없는 이름으로', () => {
		const next = renameInTransaction(tx({ category: '식비', subcategory: '외식' }), '식비:외식', '외식비');

		expect(next).toMatchObject({ category: '외식비', subcategory: '' });
	});

	// 실측: 분할 항목 2,876개 중 2,270개에 subcategory 가 있다.
	test('분할 항목도 옮긴다', () => {
		const next = renameInTransaction(tx({
			category: '월급&보너스',
			subcategory: '월급',
			division: [
				{ category: '세금', subcategory: '소득세', amount: -9520 },
				{ category: '세금', subcategory: '건강보험', amount: -58830 }
			]
		}), '세금:소득세', '세금:종합소득세');

		expect(next.division[0]).toMatchObject({ category: '세금', subcategory: '종합소득세' });
		expect(next.division[1]).toMatchObject({ category: '세금', subcategory: '건강보험' });
		// 최상위는 그대로
		expect(next.subcategory).toBe('월급');
	});

	test('분할 항목을 바꾸지 않을 때는 배열을 그대로 둔다', () => {
		const original = tx({ category: '통신비', division: [{ category: '세금', subcategory: '소득세', amount: -1 }] });
		const next = renameInTransaction(original, '통신비', '통신비2');

		expect(next.division).toBe(original.division);
	});

	// 바뀐 문서만 bulkDocs 에 보내기 위한 계약이다.
	test('바뀐 게 없으면 null', () => {
		expect(renameInTransaction(tx({ category: '통신비' }), '식비:군것질', '식비:간식')).toBeNull();
		expect(renameInTransaction(tx({ category: '식비' }), '식비:군것질', '식비:간식')).toBeNull();
		expect(renameInTransaction(undefined, '가', '나')).toBeNull();
	});

	// subcategory 가 없는 거래와 빈 문자열인 거래를 같게 본다.
	test('subcategory 없음과 빈 문자열을 같게 본다', () => {
		expect(renameInTransaction(tx({ category: '통신비' }), '통신비', '통신')).not.toBeNull();
		expect(renameInTransaction(tx({ category: '통신비', subcategory: '' }), '통신비', '통신')).not.toBeNull();
	});

	test('원본을 바꾸지 않는다', () => {
		const original = tx({ category: '식비', subcategory: '군것질', division: [{ category: '식비', subcategory: '군것질', amount: -1 }] });
		const snapshot = JSON.parse(JSON.stringify(original));
		renameInTransaction(original, '식비:군것질', '식비:간식');

		expect(original).toEqual(snapshot);
	});

	test('_id 와 _rev 를 유지한다', () => {
		const next = renameInTransaction(
			tx({ _id: 'a', _rev: '3-x', category: '통신비' }), '통신비', '통신');

		expect(next._id).toBe('a');
		expect(next._rev).toBe('3-x');
	});
});

describe('renameInPayment', () => {
	test('맞으면 옮긴다', () => {
		const next = renameInPayment({ payee: '휴대폰요금', category: '통신비' }, '통신비', '통신');

		expect(next).toMatchObject({ payee: '휴대폰요금', category: '통신', subcategory: '' });
	});

	test('안 맞으면 null', () => {
		expect(renameInPayment({ category: '보험' }, '통신비', '통신')).toBeNull();
		expect(renameInPayment(undefined, '통신비', '통신')).toBeNull();
	});

	test('서브카테고리까지 맞춰본다', () => {
		expect(renameInPayment({ category: '가족', subcategory: '자녀용돈' }, '가족', '식구')).toBeNull();
		expect(renameInPayment({ category: '가족', subcategory: '자녀용돈' }, '가족:자녀용돈', '가족:용돈'))
			.toMatchObject({ category: '가족', subcategory: '용돈' });
	});
});

describe('countTransactionRefs', () => {
	const LIST = [
		tx({ _id: '1', category: '식비', subcategory: '군것질' }),
		tx({ _id: '2', category: '식비', subcategory: '외식' }),
		tx({ _id: '3', category: '통신비' }),
		tx({ _id: '4', division: [{ category: '식비', subcategory: '군것질', amount: -1 }] })
	];

	test('최상위와 분할을 함께 센다', () => {
		expect(countTransactionRefs(LIST, '식비:군것질')).toBe(2);
		expect(countTransactionRefs(LIST, '통신비')).toBe(1);
		expect(countTransactionRefs(LIST, '없는카테고리')).toBe(0);
	});

	// 사용자에게 의미 있는 단위는 '옮겨질 거래 건수' 다.
	test('분할 항목이 여럿 걸린 거래는 한 번만 센다', () => {
		const multi = [tx({
			_id: '5',
			division: [
				{ category: '세금', subcategory: '소득세', amount: -1 },
				{ category: '세금', subcategory: '소득세', amount: -2 }
			]
		})];

		expect(countTransactionRefs(multi, '세금:소득세')).toBe(1);
	});

	test('부모 이름은 자식 거래를 세지 않는다', () => {
		expect(countTransactionRefs(LIST, '식비')).toBe(0);
	});

	test('빈 입력', () => {
		expect(countTransactionRefs([], '식비')).toBe(0);
		expect(countTransactionRefs(undefined, '식비')).toBe(0);
		expect(countTransactionRefs(LIST, '')).toBe(0);
		expect(countTransactionRefs(LIST, undefined)).toBe(0);
	});
});

describe('countPaymentRefs / categoryImpact', () => {
	const PAY = [
		{ payee: '휴대폰요금', category: '통신비' },
		{ payee: '인터넷요금', category: '통신비' },
		{ payee: '보험료', category: '보험' }
	];

	test('정기지불을 센다', () => {
		expect(countPaymentRefs(PAY, '통신비')).toBe(2);
		expect(countPaymentRefs(PAY, '회비')).toBe(0);
		expect(countPaymentRefs(undefined, '통신비')).toBe(0);
	});

	test('요약을 함께 낸다', () => {
		expect(categoryImpact('통신비', [tx({ category: '통신비' })], PAY))
			.toEqual({ transactionCount: 1, paymentCount: 2 });
	});

	test('참조가 없으면 둘 다 0', () => {
		expect(categoryImpact('없음', [], [])).toEqual({ transactionCount: 0, paymentCount: 0 });
	});
});
