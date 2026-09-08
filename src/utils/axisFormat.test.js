import { formatUnit, formatPercentTick, formatKrwTick } from './axisFormat';

describe('formatUnit', () => {
	// 실측 결함. Recharts 는 0..6M 을 5눈금으로 나눠 1.5M 간격을 쓰는데,
	// 소수점을 버려서 0 · 2M · 3M · 5M · 6M 으로 찍혔다. 간격이 불규칙해
	// 보이고 4.82M 막대가 '5M' 선을 넘은 것처럼 읽혔다.
	test('반값 눈금을 그대로 보여준다', () => {
		const ticks = [0, 1500000, 3000000, 4500000, 6000000];

		expect(ticks.map(v => formatUnit(v, 1000000, 'M')))
			.toEqual(['0M', '1.5M', '3M', '4.5M', '6M']);
	});

	// 최댓값이 5M 이면 1.25M 간격이 나온다.
	test('사분값 눈금도 보여준다', () => {
		expect(formatUnit(1250000, 1000000, 'M')).toBe('1.25M');
		expect(formatUnit(3750000, 1000000, 'M')).toBe('3.75M');
	});

	test('정수는 소수점을 붙이지 않는다', () => {
		expect(formatUnit(3000000, 1000000, 'M')).toBe('3M');
		expect(formatUnit(1000, 1000, 'K')).toBe('1K');
	});

	test('접미사가 없으면 숫자만', () => {
		expect(formatUnit(1500, 1000)).toBe('1.5');
	});

	test('음수', () => {
		expect(formatUnit(-4500000, 1000000, 'M')).toBe('-4.5M');
	});

	// 자릿수를 넘는 값은 잘린다. 눈금은 보통 깔끔한 수라 문제되지 않는다.
	test('소수 자릿수를 제한한다', () => {
		expect(formatUnit(1234567, 1000000, 'M')).toBe('1.23M');
		expect(formatUnit(1234567, 1000000, 'M', 1)).toBe('1.2M');
		expect(formatUnit(1234567, 1000000, 'M', 0)).toBe('1M');
	});

	test('0', () => {
		expect(formatUnit(0, 1000000, 'M')).toBe('0M');
	});

	// Recharts 가 도메인을 못 잡으면 NaN 눈금을 넘길 수 있다.
	test('숫자가 아니면 빈 문자열', () => {
		expect(formatUnit(NaN, 1000000, 'M')).toBe('');
		expect(formatUnit(undefined, 1000000, 'M')).toBe('');
		expect(formatUnit(Infinity, 1000000, 'M')).toBe('');
	});
});

describe('formatPercentTick', () => {
	// 수익률 축이 12.5% 를 '13%' 로 찍고 있었다.
	test('반값 눈금을 그대로 보여준다', () => {
		expect([0, 12.5, 25, 37.5].map(formatPercentTick))
			.toEqual(['0%', '12.5%', '25%', '37.5%']);
	});

	test('정수는 소수점을 붙이지 않는다', () => {
		expect(formatPercentTick(12)).toBe('12%');
		expect(formatPercentTick(-8)).toBe('-8%');
	});

	// 기본은 한 자리다. 축 폭이 좁아 두 자리는 잘 안 들어간다.
	test('기본 소수 한 자리', () => {
		expect(formatPercentTick(12.34)).toBe('12.3%');
	});
});

describe('formatKrwTick', () => {
	// 값 표시는 fmtKRW 로 '₩482만' 인데 축은 '4.5M' 이었다. 같은 차트에서
	// 단위가 갈려 매번 환산해야 했다.
	test('만 단위로 눈금을 찍는다', () => {
		const ticks = [0, 1500000, 3000000, 4500000, 6000000];

		expect(ticks.map(formatKrwTick))
			.toEqual(['0', '150만', '300만', '450만', '600만']);
	});

	// M 단위에서는 소수였던 눈금이 만 단위에서는 정수로 떨어진다.
	test('사분값 눈금도 정수로 떨어진다', () => {
		expect(formatKrwTick(1250000)).toBe('125만');
		expect(formatKrwTick(3750000)).toBe('375만');
	});

	// fmtKRW 와 같은 1억 문턱을 쓴다.
	test('1억부터 억 단위', () => {
		expect(formatKrwTick(100000000)).toBe('1억');
		expect(formatKrwTick(250000000)).toBe('2.5억');
		expect(formatKrwTick(99990000)).toBe('9999만');
	});

	test('1만 미만은 그대로', () => {
		expect(formatKrwTick(7900)).toBe('7,900');
		expect(formatKrwTick(0)).toBe('0');
	});

	// 부호는 fmtKRW 와 같은 U+2212 다.
	test('음수', () => {
		expect(formatKrwTick(-4500000)).toBe('−450만');
		expect(formatKrwTick(-7900)).toBe('−7,900');
	});

	test('숫자가 아니면 빈 문자열', () => {
		expect(formatKrwTick(NaN)).toBe('');
		expect(formatKrwTick(undefined)).toBe('');
	});
});
