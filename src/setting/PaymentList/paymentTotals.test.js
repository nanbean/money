import {
	isTransferPayment,
	monthlyAmountKrw,
	splitPaymentTotals,
	comparePaymentsByDay,
	sortPaymentsByDay
} from './paymentTotals';

const pay = (over = {}) => ({ amount: -10000, currency: 'KRW', interval: 1, valid: true, category: '통신비', ...over });

describe('isTransferPayment', () => {
	test('[계좌명] 카테고리는 이체', () => {
		expect(isTransferPayment(pay({ category: '[IRP_Cash]' }))).toBe(true);
		expect(isTransferPayment(pay({ category: '[어머니보관금]' }))).toBe(true);
	});

	test('일반 카테고리는 비용', () => {
		expect(isTransferPayment(pay({ category: '대출이자' }))).toBe(false);
		expect(isTransferPayment(pay({ category: '보험' }))).toBe(false);
	});

	// 한쪽만 대괄호면 이체가 아니다.
	test('반쪽 대괄호는 비용', () => {
		expect(isTransferPayment(pay({ category: '[IRP' }))).toBe(false);
		expect(isTransferPayment(pay({ category: 'IRP]' }))).toBe(false);
	});

	test('카테고리가 없으면 비용', () => {
		expect(isTransferPayment(pay({ category: '' }))).toBe(false);
		expect(isTransferPayment(pay({ category: undefined }))).toBe(false);
		expect(isTransferPayment(undefined)).toBe(false);
	});
});

describe('monthlyAmountKrw', () => {
	test('interval 로 나눠 월 부담을 낸다', () => {
		expect(monthlyAmountKrw(pay({ amount: -120000, interval: 12 }))).toBe(-10000);
		expect(monthlyAmountKrw(pay({ amount: -1950, interval: 2 }))).toBe(-975);
	});

	test('interval 이 없거나 0 이면 월간으로 본다', () => {
		expect(monthlyAmountKrw(pay({ amount: -5000, interval: undefined }))).toBe(-5000);
		expect(monthlyAmountKrw(pay({ amount: -5000, interval: 0 }))).toBe(-5000);
	});

	test('USD 는 환율을 곱한다', () => {
		expect(monthlyAmountKrw(pay({ amount: -10, currency: 'USD' }), 1378.85)).toBe(-13788.5);
	});

	test('KRW 에는 환율을 곱하지 않는다', () => {
		expect(monthlyAmountKrw(pay({ amount: -10000 }), 1378.85)).toBe(-10000);
	});

	// 환율이 아직 안 들어온 초기 렌더에서 USD 금액이 0 이 되면 합계가 조용히 줄어든다.
	test('환율이 유효하지 않으면 1 로 둔다', () => {
		[0, -1, undefined, null, NaN, 'x'].forEach(rate => {
			expect(monthlyAmountKrw(pay({ amount: -10, currency: 'USD' }), rate)).toBe(-10);
		});
	});

	test('금액이 없으면 0', () => {
		expect(monthlyAmountKrw(pay({ amount: undefined }))).toBe(0);
		expect(monthlyAmountKrw(undefined)).toBe(0);
	});
});

describe('splitPaymentTotals', () => {
	test('빈 목록은 전부 0', () => {
		expect(splitPaymentTotals([])).toEqual({ all: 0, expense: 0, transfer: 0 });
		expect(splitPaymentTotals(undefined)).toEqual({ all: 0, expense: 0, transfer: 0 });
	});

	test('비용과 이체를 나눠 담고 합계는 둘의 합', () => {
		const totals = splitPaymentTotals([
			pay({ amount: -2489571, category: '대출이자' }),
			pay({ amount: -500000, category: '[연금저축_Cash]' }),
			pay({ amount: -250000, category: '[IRP_Cash]' })
		]);

		expect(totals.expense).toBe(-2489571);
		expect(totals.transfer).toBe(-750000);
		expect(totals.all).toBe(-3239571);
	});

	// 일시중지는 지금 나가는 돈이 아니다. 예전 totalMonthlyKrw 도 valid 만 셌다.
	test('일시중지 항목은 세지 않는다', () => {
		const totals = splitPaymentTotals([
			pay({ amount: -10000, category: '통신비' }),
			pay({ amount: -99999, category: '통신비', valid: false }),
			pay({ amount: -88888, category: '[IRP_Cash]', valid: false })
		]);

		expect(totals).toEqual({ all: -10000, expense: -10000, transfer: 0 });
	});

	test('이체가 없으면 transfer 가 0 (히어로 분해 줄이 숨는 조건)', () => {
		const totals = splitPaymentTotals([pay({ amount: -10000, category: '보험' })]);

		expect(totals.transfer).toBe(0);
		expect(totals.expense).toBe(totals.all);
	});

	// 실측 재현 (활성 17건, 환율 1378.85). 히어로가 ₩489만 한 덩어리로 보여주던 값.
	test('실제 설정값의 구성을 재현한다', () => {
		const totals = splitPaymentTotals([
			pay({ amount: -10000, category: '회비' }),
			pay({ amount: -250000, category: '[IRP_Cash]' }),
			pay({ amount: -500000, category: '[연금저축_Cash]' }),
			pay({ amount: -13113, currency: 'USD', category: '취미-레저', subcategory: '여가', valid: false }),
			pay({ amount: -3000, category: '통신비' }),
			pay({ amount: -35946, category: '보험' }),
			pay({ amount: -1950, interval: 2, category: '통신비' }),
			pay({ amount: -30000, category: '회비' }),
			pay({ amount: -5500, category: '통신비' }),
			pay({ amount: -50193, category: '보험' }),
			pay({ amount: -2489571, category: '대출이자' }),
			pay({ amount: -460000, category: '[어머니보관금]' }),
			pay({ amount: -18000, category: '통신비' }),
			pay({ amount: -250000, category: '[IRP오은미_Cash]' }),
			pay({ amount: -500000, category: '[오은미연금저축_Cash]' }),
			pay({ amount: -114548, category: '보험' }),
			pay({ amount: -100000, category: '가족', subcategory: '자녀용돈' }),
			pay({ amount: -70000, category: '가족', subcategory: '자녀용돈' })
		], 1378.85);

		expect(Math.round(totals.all)).toBe(-4887733);
		expect(Math.round(totals.expense)).toBe(-2927733);
		expect(Math.round(totals.transfer)).toBe(-1960000);
	});
});

describe('sortPaymentsByDay', () => {
	const p = (day, payee = 'x') => ({ day, payee });
	const days = (list) => sortPaymentsByDay(list).map(i => i.day);

	test('결제일 오름차순으로 늘어놓는다', () => {
		expect(days([p(20), p(3), p(11), p(1)])).toEqual([1, 3, 11, 20]);
	});

	// 문자열로 저장된 값이 있다 — 입력이 type=number 라도 e.target.value 는
	// 문자열이고, handleSubmit 을 거치지 않은 옛 데이터가 남아 있다.
	test('문자열 결제일도 숫자로 본다', () => {
		expect(days([p('20'), p('3'), p(11)])).toEqual(['3', 11, '20']);
	});

	// 값이 없는 항목이 1일과 섞이면 목록이 날짜순으로 안 읽힌다.
	test('결제일이 없으면 뒤로 보낸다', () => {
		expect(days([p(undefined), p(5), p(null), p(1), p(0)]))
			.toEqual([1, 5, undefined, null, 0]);
	});

	test('같은 날은 이름순으로 가른다', () => {
		const sorted = sortPaymentsByDay([p(5, '넷플릭스'), p(5, '가스요금'), p(5, '통신비')]);

		expect(sorted.map(i => i.payee)).toEqual(['가스요금', '넷플릭스', '통신비']);
	});

	test('원본을 바꾸지 않는다', () => {
		const list = [p(20), p(3)];
		sortPaymentsByDay(list);

		expect(list.map(i => i.day)).toEqual([20, 3]);
	});

	test('빈 입력', () => {
		expect(sortPaymentsByDay([])).toEqual([]);
		expect(sortPaymentsByDay(undefined)).toEqual([]);
	});

	// payee 가 없는 옛 항목이 있다.
	test('이름이 없어도 죽지 않는다', () => {
		expect(() => sortPaymentsByDay([{ day: 5 }, { day: 5 }])).not.toThrow();
		expect(comparePaymentsByDay(undefined, undefined)).toBe(0);
	});
});
