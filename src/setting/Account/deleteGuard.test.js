import { cascadeAccountOf, accountDeletePlan } from './deleteGuard';

const invst = (name, cashId) => ({ _id: `account:Invst:${name}`, name, type: 'Invst', balance: 1000, cashAccountId: cashId });
const cash = (name) => ({ _id: `account:Bank:${name}_Cash`, name: `${name}_Cash`, type: 'Bank', balance: 500 });
const bank = (name, balance = 100) => ({ _id: `account:Bank:${name}`, name, type: 'Bank', balance });
const tx = (accountId) => ({ _id: `2026-01-01:x:${Math.random()}`, accountId, amount: -1 });

const KIWOOM = invst('키움증권', 'account:Bank:키움증권_Cash');
const KIWOOM_CASH = cash('키움증권');
const PAYROLL = bank('급여계좌');
const LIST = [KIWOOM, KIWOOM_CASH, PAYROLL];

describe('cascadeAccountOf', () => {
	// deleteAccountAction 의 연쇄는 양방향이다.
	test('Invst 를 지우면 동반 _Cash 가 함께 지워진다', () => {
		expect(cascadeAccountOf(KIWOOM, LIST)).toBe(KIWOOM_CASH);
	});

	test('_Cash 를 지우면 부모 Invst 가 함께 지워진다', () => {
		expect(cascadeAccountOf(KIWOOM_CASH, LIST)).toBe(KIWOOM);
	});

	test('일반 계좌는 연쇄가 없다', () => {
		expect(cascadeAccountOf(PAYROLL, LIST)).toBeNull();
	});

	test('짝이 목록에 없으면 null', () => {
		expect(cascadeAccountOf(KIWOOM, [KIWOOM])).toBeNull();
		expect(cascadeAccountOf(KIWOOM_CASH, [KIWOOM_CASH])).toBeNull();
	});

	test('cashAccountId 가 없는 Invst 는 연쇄가 없다', () => {
		expect(cascadeAccountOf(invst('빈투자', undefined), LIST)).toBeNull();
	});

	test('빈 값에 흔들리지 않는다', () => {
		expect(cascadeAccountOf(undefined, LIST)).toBeNull();
		expect(cascadeAccountOf(PAYROLL, undefined)).toBeNull();
		expect(cascadeAccountOf(PAYROLL, [null, undefined])).toBeNull();
	});
});

describe('accountDeletePlan', () => {
	// 이게 핵심이다. 거래가 남으면 순자산에서는 잔액이 사라지는데(계좌 목록 순회)
	// 지출에서는 계속 집계된다(accountId 문자열만 파싱).
	test('거래가 있으면 막는다', () => {
		const plan = accountDeletePlan(PAYROLL, LIST, [tx(PAYROLL._id), tx(PAYROLL._id)]);

		expect(plan.blocked).toBe(true);
		expect(plan.transactionCount).toBe(2);
	});

	test('거래가 없으면 막지 않는다', () => {
		expect(accountDeletePlan(PAYROLL, LIST, []).blocked).toBe(false);
		expect(accountDeletePlan(PAYROLL, LIST, [tx('account:Bank:다른계좌')]).blocked).toBe(false);
	});

	// 동반 계좌의 거래도 함께 세야 한다. Invst 자체는 거래가 없어도 _Cash 쪽에
	// 있으면 삭제로 그 거래가 고아가 된다.
	test('동반 계좌의 거래까지 센다', () => {
		const plan = accountDeletePlan(KIWOOM, LIST, [tx(KIWOOM_CASH._id)]);

		expect(plan.transactionCount).toBe(1);
		expect(plan.blocked).toBe(true);
	});

	test('삭제 대상에 동반 계좌를 포함한다', () => {
		const plan = accountDeletePlan(KIWOOM, LIST, []);

		expect(plan.targets).toEqual([KIWOOM, KIWOOM_CASH]);
		expect(plan.cascade).toBe(KIWOOM_CASH);
	});

	test('연쇄가 없으면 대상은 하나', () => {
		const plan = accountDeletePlan(PAYROLL, LIST, []);

		expect(plan.targets).toEqual([PAYROLL]);
		expect(plan.cascade).toBeNull();
	});

	// 사라질 금액을 사용자에게 보여주기 위한 값이다.
	test('잔액은 대상 전체의 합', () => {
		expect(accountDeletePlan(KIWOOM, LIST, []).balance).toBe(1500);
		expect(accountDeletePlan(PAYROLL, LIST, []).balance).toBe(100);
	});

	test('잔액이 없는 계좌는 0으로 센다', () => {
		const noBalance = { _id: 'account:Bank:빈계좌', name: '빈계좌', type: 'Bank' };
		expect(accountDeletePlan(noBalance, [noBalance], []).balance).toBe(0);
	});

	test('_id 가 없으면 빈 계획', () => {
		expect(accountDeletePlan({ name: '가' }, LIST, [])).toEqual({
			targets: [], cascade: null, transactionCount: 0, balance: 0, blocked: false
		});
		expect(accountDeletePlan(undefined, LIST, []).blocked).toBe(false);
	});

	test('거래 목록이 없어도 동작한다', () => {
		expect(accountDeletePlan(PAYROLL, LIST, undefined).transactionCount).toBe(0);
		expect(accountDeletePlan(PAYROLL, LIST, [null, undefined]).transactionCount).toBe(0);
	});

	// 실측: '토지주택' 은 거래 59건 · 잔액 ₩17.3억. 한 번의 클릭으로 지워졌다.
	test('실측 사례를 막는다', () => {
		const land = { _id: 'account:Oth A:토지주택', name: '토지주택', type: 'Oth A', balance: 1734437262 };
		const plan = accountDeletePlan(land, [land], Array.from({ length: 59 }, () => tx(land._id)));

		expect(plan.blocked).toBe(true);
		expect(plan.transactionCount).toBe(59);
		expect(plan.balance).toBe(1734437262);
	});
});
