import { payeeKey, pickPayeeLabel, renamePayeeDocs } from './payee';

describe('payeeKey', () => {
	test('대소문자·앞뒤·연속 공백이 달라도 같은 키', () => {
		expect(payeeKey('Aliexpress')).toBe(payeeKey(' ALIEXPRESS  '));
		expect(payeeKey('Traders  Dongtan Br')).toBe(payeeKey('TRADERS DONGTAN BR'));
	});

	test('자모 분해(NFD) 한글도 완성형과 같은 키', () => {
		expect(payeeKey('도미노피자'.normalize('NFD'))).toBe(payeeKey('도미노피자'));
	});

	test('지점명이 다르면 다른 키', () => {
		expect(payeeKey('DEOJEIMAKES JUSIKHOESA')).not.toBe(payeeKey('DEOJEIMAKES DONGTAN HANSANGDEU'));
	});
});

describe('pickPayeeLabel', () => {
	test('사용자가 고친 표기를 우선한다', () => {
		expect(pickPayeeLabel([
			{ payee: 'ALIEXPRESS' }, { payee: 'ALIEXPRESS' }, { payee: 'ALIEXPRESS' },
			{ payee: 'Aliexpress', originalPayee: 'aliexpress' }
		])).toBe('Aliexpress');
	});

	test('고친 이력이 없으면 가장 많이 쓰인 표기', () => {
		expect(pickPayeeLabel([{ payee: 'Starbucks' }, { payee: 'STARBUCKS' }, { payee: 'Starbucks' }])).toBe('Starbucks');
	});
});

describe('renamePayeeDocs', () => {
	const txns = [
		{ _id: 'a', payee: 'DEOJEIMAKES JUSIKHOESA' },
		{ _id: 'b', payee: 'deojeimakes  jusikhoesa' },
		{ _id: 'c', payee: 'DEOJEIMAKES DONGTAN HANSANGDEU' },
		{ _id: 'd', payee: 'DEOJEIMAKES JUSIKHOESA', originalPayee: 'DEOJEIMAKES JUSIKHOESA(KR)' },
		{ _id: 'e', payee: '더제이메이크스' }
	];

	test('같은 가맹점만 바꾸고 원래 표기를 남긴다 (편집 중인 거래 제외)', () => {
		const out = renamePayeeDocs(txns, 'DEOJEIMAKES JUSIKHOESA', '더제이메이크스', 'a');
		expect(out.map(t => t._id)).toEqual(['b', 'd']);
		expect(out[0]).toMatchObject({ payee: '더제이메이크스', originalPayee: 'deojeimakes  jusikhoesa' });
		expect(out[1].originalPayee).toBe('DEOJEIMAKES JUSIKHOESA(KR)'); // 기존 원래 표기는 유지
	});

	test('새 이름이 비었거나 같으면 아무것도 바꾸지 않는다', () => {
		expect(renamePayeeDocs(txns, 'DEOJEIMAKES JUSIKHOESA', '  ')).toEqual([]);
		expect(renamePayeeDocs(txns, '더제이메이크스', '더제이메이크스')).toEqual([]);
	});
});
