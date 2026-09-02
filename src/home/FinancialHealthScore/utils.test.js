import moment from 'moment';

import { calcSavingsBreakdown, calcSavingsScore } from './utils';

// 창은 '완성된 직전 3개월' 이다. 당월은 부분 데이터라 제외한다.
const inWindow = () => moment().subtract(2, 'months').format('YYYY-MM-15');
const outOfWindow = () => moment().format('YYYY-MM-15');

const PAYROLL = { _id: 'account:Bank:급여계좌', name: '급여계좌', type: 'Bank', currency: 'KRW' };
const BOA = { _id: 'account:Bank:BoA', name: 'BoA', type: 'Bank', currency: 'USD' };
const BROKER_CASH = { _id: 'account:Bank:키움증권_Cash', name: '키움증권_Cash', type: 'Bank', currency: 'KRW' };
const BROKER = { _id: 'account:Invst:키움증권', name: '키움증권', type: 'Invst', currency: 'KRW' };
const ACCOUNTS = [PAYROLL, BOA, BROKER_CASH, BROKER];

const tx = (over) => ({
	_id: `tx-${Math.random()}`,
	accountId: PAYROLL._id,
	date: inWindow(),
	...over
});

const run = (transactions, exempt = []) =>
	calcSavingsBreakdown(transactions, ACCOUNTS, exempt, 1378.85, 'KRW');

describe('calcSavingsBreakdown', () => {
	test('수입과 지출을 나눠 저축률을 낸다', () => {
		const result = run([
			tx({ category: '월급&보너스', subcategory: '월급', amount: 1000000 }),
			tx({ category: '식비', subcategory: '외식', amount: -300000 })
		]);

		expect(result).toEqual({ income: 1000000, expense: 300000, savingsRate: 0.7 });
	});

	test('완성된 직전 3개월만 센다', () => {
		const result = run([
			tx({ category: '기타 수입', amount: 1000, date: outOfWindow() }),
			tx({ category: '기타 지출', amount: -500, date: outOfWindow() })
		]);

		expect(result).toEqual({ income: 0, expense: 0, savingsRate: 0 });
	});

	// 실측 결함 1 — 면제 목록에는 '세금:소득세' 처럼 서브카테고리까지 지정된
	// 항목이 많은데 t.category 접두어로만 비교해서 하나도 걸러지지 않았다.
	// 2026-06~08 창에서 8건 ₩29,364,318 이 생활비로 잡혔다.
	test('서브카테고리까지 지정된 면제 항목이 걸러진다', () => {
		const transactions = [
			tx({ category: '월급&보너스', subcategory: '월급', amount: 1000000 }),
			tx({ category: '세금', subcategory: '소득세', amount: -400000 })
		];

		expect(run(transactions, ['세금:소득세']).expense).toBe(0);
		// 면제가 없으면 지출로 센다
		expect(run(transactions, []).expense).toBe(400000);
	});

	test('부모 이름 면제는 자식까지 덮는다', () => {
		const result = run([
			tx({ category: '기타 수입', amount: 1000000 }),
			tx({ category: '세금', subcategory: '소득세', amount: -400000 })
		], ['세금']);

		expect(result.expense).toBe(0);
	});

	// 경로 단위 비교라 접두어만 겹치는 이름은 덮지 않는다.
	test('접두어만 겹치는 카테고리는 면제되지 않는다', () => {
		const result = run([
			tx({ category: '기타 수입', amount: 1000000 }),
			tx({ category: '보험료', amount: -50000 })
		], ['보험']);

		expect(result.expense).toBe(50000);
	});

	// 실측 결함 2 — 분할을 펼치지 않고 부모 금액만 봤다. 급여는 부모가 양수인데
	// 분할 안에 세금·보험 같은 지출이 들어 있다.
	describe('분할 거래', () => {
		const payroll = tx({
			category: '월급&보너스',
			subcategory: '월급',
			amount: 700000,
			division: [
				{ category: '월급&보너스', subcategory: '월급', amount: 1000000, description: '월급' },
				{ category: '세금', subcategory: '소득세', amount: -200000, description: '소득세' },
				{ category: '식비', subcategory: '군것질', amount: -100000, description: '간식' }
			]
		});

		test('분할 항목을 펼쳐서 센다', () => {
			const result = run([payroll]);

			expect(result.income).toBe(1000000);
			expect(result.expense).toBe(300000);
		});

		test('부모 금액은 계산에 넣지 않는다', () => {
			// 부모만 봤다면 income 700000 · expense 0 이 된다.
			expect(run([payroll]).income).not.toBe(700000);
		});

		test('분할 안의 면제 항목도 걸러진다', () => {
			expect(run([payroll], ['세금:소득세']).expense).toBe(100000);
		});
	});

	// 사용자가 지적한 항목. 창 안에는 지금 해당 거래가 없어 값은 안 바뀌지만,
	// 매수·매도가 지출·수입으로 잡히면 현금 흐름이 왜곡된다.
	test('투자현금 계좌 거래는 제외한다', () => {
		const result = run([
			tx({ category: '기타 수입', amount: 1000000 }),
			tx({ accountId: BROKER_CASH._id, category: '기타 수입', amount: 5000000 }),
			tx({ accountId: BROKER_CASH._id, category: '수수료', amount: -500 })
		]);

		expect(result).toMatchObject({ income: 1000000, expense: 0 });
	});

	test('투자 계좌 거래는 제외한다', () => {
		const result = run([
			tx({ accountId: BROKER._id, category: '기타 수입', amount: 5000000 })
		]);

		expect(result.income).toBe(0);
	});

	test('계좌 간 이체는 양쪽 다 제외한다', () => {
		const result = run([
			tx({ category: '[비자금]', amount: -500000 }),
			tx({ category: '[급여계좌]', amount: 500000 })
		]);

		expect(result).toEqual({ income: 0, expense: 0, savingsRate: 0 });
	});

	test('실제지출아님·실제수입아님은 제외한다', () => {
		const result = run([
			tx({ category: '기타 수입', amount: 1000000 }),
			tx({ category: '실제수입아님', amount: 9000000 }),
			tx({ category: '실제지출아님', amount: -9000000 })
		]);

		expect(result).toMatchObject({ income: 1000000, expense: 0 });
	});

	test('대출 원금은 지출이 아니다', () => {
		const result = run([tx({
			category: '월급&보너스',
			amount: -100000,
			division: [
				{ category: '대출이자', amount: -30000, description: '이자', payee: 'Principal' },
				{ category: '대출이자', amount: -20000, description: '이자' }
			]
		})]);

		expect(result.expense).toBe(20000);
	});

	test('USD 계좌는 표시 통화로 환산한다', () => {
		const result = run([
			tx({ accountId: BOA._id, category: '기타 수입', amount: 100 }),
			tx({ accountId: BOA._id, category: '기타 지출', amount: -50 })
		]);

		expect(Math.round(result.income)).toBe(137885);
		expect(Math.round(result.expense)).toBe(68943);
	});

	test('수입이 없으면 저축률 0', () => {
		expect(run([tx({ category: '기타 지출', amount: -1000 })]).savingsRate).toBe(0);
	});

	test('지출이 수입을 넘으면 저축률이 음수', () => {
		const result = run([
			tx({ category: '기타 수입', amount: 1000 }),
			tx({ category: '기타 지출', amount: -1500 })
		]);

		expect(result.savingsRate).toBeCloseTo(-0.5);
	});

	test('빈 입력', () => {
		expect(run([])).toEqual({ income: 0, expense: 0, savingsRate: 0 });
		expect(run(undefined)).toEqual({ income: 0, expense: 0, savingsRate: 0 });
	});
});

describe('calcSavingsScore', () => {
	const score = (income, expense) => {
		const transactions = [
			tx({ category: '기타 수입', amount: income }),
			tx({ category: '기타 지출', amount: -expense })
		];
		return calcSavingsScore(transactions, ACCOUNTS, [], 1378.85, 'KRW');
	};

	// 경계는 모두 포함이다 (>= 0.2 / >= 0.1 / >= 0).
	test.each([
		[1000, 700, 25],
		[1000, 800, 25],
		[1000, 801, 15],
		[1000, 900, 15],
		[1000, 901, 8],
		[1000, 1000, 8],
		[1000, 1001, 0]
	])('수입 %i · 지출 %i → %i점', (income, expense, expected) => {
		expect(score(income, expense)).toBe(expected);
	});

	// 실측: 두 결함 탓에 -33.7% 가 나와 점수가 0이었다. 바로잡으면 +42.1% → 25점.
	test('수입이 없으면 0점', () => {
		expect(calcSavingsScore([], ACCOUNTS, [], 1378.85, 'KRW')).toBe(0);
	});
});
