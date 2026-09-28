import {
	earnedIncomeDeduction,
	calculatedTax,
	cardDeduction,
	spendingTargets,
	pensionTaxCredit,
	calcYearEndTax,
	marginalSaving,
	recommendCard
} from './taxDeduction';

// 실측 기준. 2026년 오은미(교사)의 급여명세 division 에서 뽑은 값이다.
// 1~6월은 해외 체류로 무급이었고 7/21 복직했다.
const EUNMI_2026 = {
	salary: 26905370,
	dependents: 1,
	pensionContribution: 3122400,
	healthInsurance: 1899190,
	creditCard: 8390000,
	cashReceipt: 700000,
	pensionSavings: 6000000,
	irp: 3000000,
	withheldTax: 1052060
};

describe('earnedIncomeDeduction', () => {
	it.each([
		[4000000, 2800000],
		[10000000, 5500000],
		[26905370, 9285805],
		[67300332, 13115016]
	])('총급여 %i 이면 %i', (salary, expected) => {
		expect(earnedIncomeDeduction(salary)).toBe(expected);
	});

	it('2천만원을 넘지 않는다', () => {
		expect(earnedIncomeDeduction(1000000000)).toBe(20000000);
	});
});

describe('calculatedTax', () => {
	it.each([
		[0, 0],
		[10000000, 600000],
		[14000000, 840000],
		[39646446, 4686966]
	])('과세표준 %i 이면 산출세액 %i', (base, expected) => {
		expect(calculatedTax(base)).toBe(expected);
	});

	it('과세표준이 음수면 0', () => {
		expect(calculatedTax(-100)).toBe(0);
	});
});

describe('cardDeduction', () => {
	it('문턱을 못 넘으면 공제가 없고 남은 금액을 알려준다', () => {
		const r = cardDeduction({ salary: 40000000, creditCard: 3000000 });
		expect(r.deduction).toBe(0);
		expect(r.threshold).toBe(10000000);
		expect(r.remainingToThreshold).toBe(7000000);
	});

	// 문턱은 공제율이 낮은 신용카드부터 태워야 한다. 순서를 뒤집으면
	// 공제율 30% 인 현금영수증이 먼저 깎여 공제액이 줄어든다.
	it('문턱을 신용카드부터 차감한다', () => {
		const r = cardDeduction({ salary: 26905370, creditCard: 8390000, cashReceipt: 700000 });
		// 문턱 6,726,342 를 신용카드에서 빼고 남은 1,663,658 × 15% + 700,000 × 30%
		expect(r.threshold).toBe(6726342);
		expect(r.deduction).toBe(459548);
	});

	it('총급여 7천만원 이하면 한도가 300만원', () => {
		const r = cardDeduction({ salary: 67300332, creditCard: 4244559, cashReceipt: 38295500 });
		expect(r.limit).toBe(3000000);
		expect(r.deduction).toBe(3000000);
		expect(r.capped).toBe(true);
	});

	it('총급여 7천만원 초과면 한도가 250만원', () => {
		expect(cardDeduction({ salary: 80000000, creditCard: 60000000 }).limit).toBe(2500000);
	});
});

describe('spendingTargets', () => {
	it('문턱을 못 넘었으면 문턱까지 남은 금액을 알려준다', () => {
		const t = spendingTargets({ salary: 26677940, creditCard: 0, cashReceipt: 0 });
		expect(t.threshold).toBe(6669485);
		expect(t.toThreshold).toBe(6669485);
	});

	// 공제율이 두 배 차이라 한도를 채우는 데 드는 금액도 두 배 차이난다.
	it('한도를 채우는 데 필요한 금액을 결제수단별로 낸다', () => {
		const t = spendingTargets({ salary: 26677940, creditCard: 8394808, cashReceipt: 0 });
		expect(t.deduction).toBe(258798);
		expect(t.headroom).toBe(3000000 - 258798);
		// 문턱은 이미 넘었으니 남은 공제액을 공제율로 나눈 금액만 더 쓰면 된다.
		expect(t.byCashReceipt).toBe(Math.ceil(t.headroom / 0.3));
		expect(t.byCreditCard).toBe(Math.ceil(t.headroom / 0.15));
		expect(t.byCreditCard).toBe(t.byCashReceipt * 2);
	});

	it('문턱 미달이면 문턱까지의 금액이 더해진다', () => {
		const t = spendingTargets({ salary: 26677940, creditCard: 1000000, cashReceipt: 0 });
		expect(t.byCashReceipt).toBe(t.toThreshold + Math.ceil(t.headroom / 0.3));
	});

	it('한도를 채웠으면 더 쓸 금액이 없다', () => {
		const t = spendingTargets({ salary: 67300332, creditCard: 4244559, cashReceipt: 38295500 });
		expect(t.capped).toBe(true);
		expect(t.headroom).toBe(0);
		expect(t.byCashReceipt).toBe(0);
		expect(t.byCreditCard).toBe(0);
	});
});

describe('pensionTaxCredit', () => {
	it('연금저축은 600만원까지만 인정한다', () => {
		const r = pensionTaxCredit({ salary: 26905370, pensionSavings: 8000000, irp: 0 });
		expect(r.eligible).toBe(6000000);
	});

	it('연금저축과 IRP 를 합쳐 900만원까지', () => {
		const r = pensionTaxCredit({ salary: 26905370, pensionSavings: 6000000, irp: 5000000 });
		expect(r.eligible).toBe(9000000);
	});

	it('총급여 5,500만원 이하면 15%', () => {
		expect(pensionTaxCredit({ salary: 26905370, pensionSavings: 6000000, irp: 3000000 }).credit).toBe(1350000);
	});

	it('총급여 5,500만원 초과면 12%', () => {
		expect(pensionTaxCredit({ salary: 67300332, pensionSavings: 6000000, irp: 3000000 }).rate).toBe(0.12);
	});
});

describe('calcYearEndTax - 오은미 2026', () => {
	it('연금계좌 세액공제가 산출세액을 덮어 결정세액이 0', () => {
		const r = calcYearEndTax(EUNMI_2026);
		expect(r.earnedIncome).toBe(17619565);
		expect(r.calculated).toBe(638305);
		expect(r.finalTax).toBe(0);
	});

	// 세액공제가 산출세액보다 큰 만큼은 그냥 사라진다. 이 값이 0 보다 크면
	// 소득공제를 아무리 늘려도 환급이 늘지 않는다는 뜻이다.
	it('쓰지 못하고 버려지는 세액공제를 알려준다', () => {
		expect(calcYearEndTax(EUNMI_2026).wastedCredit).toBeGreaterThan(1000000);
	});

	it('기납부세액이 그대로 환급된다', () => {
		expect(calcYearEndTax(EUNMI_2026).refund).toBe(1052060);
	});

	// 자녀 2명을 오은미 쪽에 넣어도 결정세액은 그대로 0 이다. 이미 세액공제가
	// 산출세액을 넘고 있어서 소득공제를 더 해도 돌아오는 게 없다.
	// 그래서 자녀공제는 소득이 높은 배우자 쪽에 넣어야 값어치를 한다.
	it('부양가족을 늘려도 결정세액은 0 그대로다', () => {
		expect(calcYearEndTax({ ...EUNMI_2026, dependents: 1 }).finalTax).toBe(0);
		expect(calcYearEndTax({ ...EUNMI_2026, dependents: 3 }).finalTax).toBe(0);
		// 환급액도 달라지지 않는다.
		expect(calcYearEndTax({ ...EUNMI_2026, dependents: 3 }).refund)
			.toBe(calcYearEndTax({ ...EUNMI_2026, dependents: 1 }).refund);
	});
});

describe('marginalSaving', () => {
	// 오은미는 결정세액이 0 이라 카드를 더 써도 돌려받을 세금이 없다.
	it('결정세액이 0 이면 한계 절세액도 0', () => {
		expect(marginalSaving(EUNMI_2026, 'credit')).toBe(0);
		expect(marginalSaving(EUNMI_2026, 'cash')).toBe(0);
	});

	it('문턱을 못 넘었으면 0', () => {
		const input = { ...EUNMI_2026, pensionSavings: 0, irp: 0, creditCard: 1000000 };
		expect(marginalSaving(input, 'credit')).toBe(0);
	});

	// 문턱을 넘고 세금도 남아 있으면 공제율 × 세율만큼 효과가 난다.
	it('문턱을 넘고 세금이 남아 있으면 현금영수증이 신용카드보다 유리하다', () => {
		const input = {
			...EUNMI_2026,
			pensionSavings: 0,
			irp: 0,
			creditCard: 10000000,
			cashReceipt: 5000000
		};
		const credit = marginalSaving(input, 'credit');
		const cash = marginalSaving(input, 'cash');
		expect(cash).toBeGreaterThan(credit);
		expect(credit).toBeGreaterThan(0);
	});

	// 공제율 30% 에 세율 6% 면 1.8% 처럼 보이지만 실제로는 0.81% 다.
	// 근로소득세액공제가 산출세액의 55% 를 돌려주고 있어서, 산출세액이 줄면
	// 그 공제도 같이 줄어 효과의 45% 만 남는다. 세율만 곱하면 두 배 넘게 틀린다.
	it('근로소득세액공제가 소득공제 효과를 깎는다', () => {
		const input = {
			...EUNMI_2026,
			pensionSavings: 0,
			irp: 0,
			creditCard: 10000000,
			cashReceipt: 5000000
		};
		expect(marginalSaving(input, 'cash')).toBeCloseTo(0.0081, 6);
	});

	it('한도를 이미 채웠으면 0', () => {
		const input = {
			...EUNMI_2026,
			pensionSavings: 0,
			irp: 0,
			cashReceipt: 40000000
		};
		expect(calcYearEndTax(input).card.capped).toBe(true);
		expect(marginalSaving(input, 'cash')).toBe(0);
	});
});

describe('recommendCard', () => {
	it('한계 절세액이 0 이면 적립되는 미국 카드를 권한다', () => {
		const r = recommendCard(EUNMI_2026);
		expect(r.bestKoreanRate).toBe(0);
		expect(r.winner).toBe('us');
	});

	// 세율 구간이 높아야 3% 를 넘는다. 저소득 구간에서는 공제율 30% 를 다 받아도
	// 미국 카드 적립을 못 이긴다.
	const HIGH_INCOME = {
		salary: 85000000,
		dependents: 3,
		pensionContribution: 4000000,
		healthInsurance: 3300000,
		creditCard: 25000000,
		cashReceipt: 5000000,
		pensionSavings: 0,
		irp: 0,
		withheldTax: 8000000
	};

	it('한국 카드 효과가 적립률보다 크면 한국 카드를 권한다', () => {
		const r = recommendCard(HIGH_INCOME, 0.03);
		expect(r.bestKoreanRate).toBeGreaterThan(0.03);
		expect(r.winner).toBe('korea');
		expect(r.bestMethod).toBe('cash');
	});

	it('적립률을 바꾸면 판단도 바뀐다', () => {
		expect(recommendCard(HIGH_INCOME, 0.5).winner).toBe('us');
	});
});
