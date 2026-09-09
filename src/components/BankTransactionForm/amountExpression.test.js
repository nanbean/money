import { isAmountExpression, evaluateAmount } from './amountExpression';

// mathjs 14 → 15 (major) 업그레이드의 유일한 방어선이다. 원래는 prod high
// 취약점 때문에 올렸고, 계산기에는 테스트가 없었다.

describe('isAmountExpression', () => {
	test.each([
		'1000+2000',
		'1500*2',
		'10000/3',
		'1000-200-300',
		'1000 + 2000'
	])('%s 는 식이다', (value) => {
		expect(isAmountExpression(value)).toBe(true);
	});

	// 숫자 하나뿐이면 그냥 금액이다. '-500' 을 식으로 보면 입력을 건드리게 된다.
	test.each([
		'1000',
		'-500',
		'',
		'0'
	])('%s 는 식이 아니다', (value) => {
		expect(isAmountExpression(value)).toBe(false);
	});

	test('숫자 없이 연산자만 있으면 식이 아니다', () => {
		expect(isAmountExpression('+++')).toBe(false);
	});

	test('숫자가 아닌 입력', () => {
		expect(isAmountExpression(undefined)).toBe(false);
		expect(isAmountExpression(null)).toBe(false);
		expect(isAmountExpression(1000)).toBe(false);
	});
});

describe('evaluateAmount', () => {
	test.each([
		['1000+2000', 3000],
		['1500*2', 3000],
		['-500+1500', 1000],
		['1000-200-300', 500],
		['1000 + 2000', 3000],
		// 괄호와 우선순위
		['(1000+2000)*2', 6000],
		['1000+2000*2', 5000]
	])('%s → %i', (value, expected) => {
		expect(evaluateAmount(value)).toBe(expected);
	});

	// USD 계좌가 있어 소수점 둘째 자리까지 남긴다.
	test('소수점 두 자리로 반올림한다', () => {
		expect(evaluateAmount('10000/3')).toBe(3333.33);
		expect(evaluateAmount('10/4')).toBe(2.5);
	});

	// null 은 '바꾸지 말라' 는 뜻이다. 0 을 넣으면 입력이 사라진다.
	test('식이 아니면 null', () => {
		expect(evaluateAmount('1000')).toBeNull();
		expect(evaluateAmount('-500')).toBeNull();
	});

	test('잘못된 식은 null', () => {
		expect(evaluateAmount('1000+')).toBeNull();
		expect(evaluateAmount('1000++2000+')).toBeNull();
	});

	// mathjs 는 단위·행렬도 계산한다. 금액 칸에 들어가면 안 된다.
	test('숫자가 아닌 결과는 null', () => {
		// '2 cm + 3 cm' 는 Unit 객체다
		expect(evaluateAmount('2 cm + 3 cm')).toBeNull();
	});

	// 원래 가드(typeof !== 'number' || isNaN)는 Infinity 를 통과시켜
	// 금액 칸에 Infinity 가 들어갔다.
	test('0 으로 나누면 null', () => {
		expect(evaluateAmount('1000/0')).toBeNull();
		expect(evaluateAmount('-1000/0')).toBeNull();
	});
});
