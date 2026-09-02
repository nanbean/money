import {
	isInvestmentCashName,
	isInvestmentCashAccountId,
	cashAccountNameFor,
	invstAccountNameFor,
	makeIsInvestmentCash
} from './investmentCash';

const invst = (name) => ({ _id: `account:Invst:${name}`, name, type: 'Invst', cashAccountId: `account:Bank:${name}_Cash` });
const cash = (name) => ({ _id: `account:Bank:${name}_Cash`, name: `${name}_Cash`, type: 'Bank' });
const bank = (name) => ({ _id: `account:Bank:${name}`, name, type: 'Bank' });

describe('isInvestmentCashName', () => {
	test('접미사로 끝나면 참', () => {
		expect(isInvestmentCashName('IRP_Cash')).toBe(true);
		expect(isInvestmentCashName('동양종금장마_Cash')).toBe(true);
	});

	// 예전 /_Cash/i 는 앵커가 없어 이름 중간에 있어도 걸렸다.
	test('이름 중간에 있으면 거짓', () => {
		expect(isInvestmentCashName('MY_CashFlow')).toBe(false);
		expect(isInvestmentCashName('_Cash보관')).toBe(false);
	});

	// addAccountAction 은 항상 '_Cash' 로 만든다. /i 는 오검지 면만 넓혔다.
	test('대소문자를 구분한다', () => {
		expect(isInvestmentCashName('IRP_cash')).toBe(false);
		expect(isInvestmentCashName('IRP_CASH')).toBe(false);
	});

	test('접미사만으로 된 이름은 거짓', () => {
		expect(isInvestmentCashName('_Cash')).toBe(false);
	});

	test('문자열이 아니면 거짓', () => {
		[undefined, null, 0, {}, []].forEach(v => expect(isInvestmentCashName(v)).toBe(false));
	});
});

describe('isInvestmentCashAccountId', () => {
	test('accountId 의 이름 부분을 본다', () => {
		expect(isInvestmentCashAccountId('account:Bank:IRP_Cash')).toBe(true);
		expect(isInvestmentCashAccountId('account:Bank:급여계좌')).toBe(false);
		expect(isInvestmentCashAccountId('account:Invst:IRP')).toBe(false);
	});

	test('빈 값이나 형식이 다르면 거짓', () => {
		expect(isInvestmentCashAccountId(undefined)).toBe(false);
		expect(isInvestmentCashAccountId('')).toBe(false);
		expect(isInvestmentCashAccountId('IRP_Cash')).toBe(false);
	});
});

describe('cashAccountNameFor / invstAccountNameFor', () => {
	test('왕복한다', () => {
		expect(cashAccountNameFor('IRP')).toBe('IRP_Cash');
		expect(invstAccountNameFor('IRP_Cash')).toBe('IRP');
	});

	// 예전 reportService 는 name.split('_')[0] 로 잘랐다. 지금 계좌 이름에는
	// '_' 가 접미사에만 있어 결과가 같지만, 이름에 '_' 가 들어가면 부모를 잃는다.
	test('이름에 밑줄이 있어도 접미사만 떼낸다', () => {
		expect(invstAccountNameFor('KB_증권_Cash')).toBe('KB_증권');
		expect('KB_증권_Cash'.split('_')[0]).toBe('KB'); // 예전 방식은 여기서 틀린다
	});

	test('투자현금이 아니면 null', () => {
		expect(invstAccountNameFor('급여계좌')).toBeNull();
		expect(invstAccountNameFor(undefined)).toBeNull();
	});
});

describe('makeIsInvestmentCash', () => {
	// 현금 계좌 문서는 일반 Bank 계좌와 필드가 완전히 같다. 권위 있는 신호는
	// Invst 쪽의 cashAccountId 뿐이다 (실제 데이터 17/17 설정됨).
	const ACCOUNTS = [invst('IRP'), cash('IRP'), bank('급여계좌')];

	test('cashAccountId 링크로 판정한다', () => {
		const is = makeIsInvestmentCash(ACCOUNTS);
		expect(is(cash('IRP'))).toBe(true);
		expect(is(bank('급여계좌'))).toBe(false);
		expect(is(invst('IRP'))).toBe(false);
	});

	// 이름이 규약을 벗어나도 링크가 있으면 잡아낸다 — 이름 의존을 끊는 지점이다.
	test('규약을 벗어난 이름도 링크가 있으면 잡는다', () => {
		const odd = { _id: 'account:Bank:연금현금', name: '연금현금', type: 'Bank' };
		const parent = { _id: 'account:Invst:연금', name: '연금', type: 'Invst', cashAccountId: odd._id };
		expect(makeIsInvestmentCash([parent, odd])(odd)).toBe(true);
	});

	// 링크를 놓쳐 분류를 잃으면 순자산·지출이 어긋난다. 이름 오검지보다 나쁘다.
	test('링크가 없으면 이름 규약으로 되돌아간다', () => {
		const is = makeIsInvestmentCash([bank('급여계좌')]);
		expect(is(cash('IRP'))).toBe(true);
	});

	test('빈 목록에서도 이름 규약은 살아 있다', () => {
		expect(makeIsInvestmentCash([])(cash('IRP'))).toBe(true);
		expect(makeIsInvestmentCash(undefined)(bank('급여계좌'))).toBe(false);
	});

	test('빈 값에 흔들리지 않는다', () => {
		const is = makeIsInvestmentCash([null, undefined, { type: 'Invst' }, bank('가')]);
		expect(is(undefined)).toBe(false);
		expect(is(cash('IRP'))).toBe(true);
	});
});
