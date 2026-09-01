import { transferCategoryName, transferCategoryFor, missingTransferCategories } from './transferCategory';

const acct = (name, type = 'Bank') => ({ name, type, _id: `account:${type}:${name}` });

describe('transferCategoryName', () => {
	test('대괄호로 감싼다', () => {
		expect(transferCategoryName('급여계좌')).toBe('[급여계좌]');
		expect(transferCategoryName('IRP_Cash')).toBe('[IRP_Cash]');
	});
});

describe('transferCategoryFor', () => {
	// 실제 설정의 계좌 종류별 보유 현황을 그대로 따른다 —
	// Bank 18/19 · CCard 6/6 · Cash 1/1 · Oth A 2/2 · Oth L 6/6 · Invst 0/17
	test.each(['Bank', 'CCard', 'Cash', 'Oth A', 'Oth L'])('%s 는 만든다', (type) => {
		expect(transferCategoryFor(acct('테스트', type))).toBe('[테스트]');
	});

	// Invst 는 보유 종목 계좌다. 현금은 동반 _Cash 에 있고 이체는 그쪽으로 간다.
	test('Invst 는 만들지 않는다', () => {
		expect(transferCategoryFor(acct('키움증권', 'Invst'))).toBeNull();
	});

	test('동반 _Cash 계좌는 Bank 이므로 만든다', () => {
		expect(transferCategoryFor(acct('키움증권_Cash', 'Bank'))).toBe('[키움증권_Cash]');
	});

	test('이름이 없으면 만들지 않는다', () => {
		expect(transferCategoryFor({ type: 'Bank' })).toBeNull();
		expect(transferCategoryFor({ name: '', type: 'Bank' })).toBeNull();
		expect(transferCategoryFor(undefined)).toBeNull();
	});
});

describe('missingTransferCategories', () => {
	const CATS = ['[급여계좌]', '보험', '통신비'];

	test('없는 것만 골라낸다', () => {
		expect(missingTransferCategories([acct('새마을금고')], CATS)).toEqual(['[새마을금고]']);
	});

	// 계좌를 지워도 이체 카테고리는 남는다 (과거 거래가 참조한다 — 고아 13건).
	// 같은 이름으로 다시 만들 때 중복을 넣으면 모든 드롭다운에 두 번 나온다.
	test('이미 있으면 넣지 않는다', () => {
		expect(missingTransferCategories([acct('급여계좌')], CATS)).toEqual([]);
	});

	test('Invst 와 동반 _Cash 를 함께 받으면 _Cash 만 만든다', () => {
		const invst = acct('연금저축', 'Invst');
		const cash = acct('연금저축_Cash', 'Bank');
		expect(missingTransferCategories([cash, invst], CATS)).toEqual(['[연금저축_Cash]']);
	});

	test('같은 이름이 두 번 와도 한 번만 낸다', () => {
		expect(missingTransferCategories([acct('비자금'), acct('비자금')], CATS)).toEqual(['[비자금]']);
	});

	test('여러 계좌를 순서대로 낸다', () => {
		expect(missingTransferCategories([acct('가'), acct('나'), acct('급여계좌')], CATS))
			.toEqual(['[가]', '[나]']);
	});

	test('빈 입력은 빈 결과', () => {
		expect(missingTransferCategories([], CATS)).toEqual([]);
		expect(missingTransferCategories(undefined, undefined)).toEqual([]);
	});

	test('카테고리 목록을 바꾸지 않는다', () => {
		const input = [...CATS];
		missingTransferCategories([acct('새계좌')], input);
		expect(input).toEqual(CATS);
	});

	// 실측: 계좌 51개 중 이체 카테고리가 없던 것은 RobinhoodMargin_Cash 뿐이었다.
	test('누락된 Bank 계좌를 잡아낸다', () => {
		const accounts = [
			acct('급여계좌'),
			acct('RobinhoodMargin_Cash'),
			acct('RobinhoodMargin', 'Invst')
		];
		expect(missingTransferCategories(accounts, CATS)).toEqual(['[RobinhoodMargin_Cash]']);
	});
});
