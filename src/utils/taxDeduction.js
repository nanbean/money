// 연말정산 계산과 '다음 1원을 어느 카드로 쓸까' 판단.
//
// 신용카드 소득공제는 문턱(총급여 25%)과 한도(300만/250만) 사이에서만 값이
// 있고, 그 구간에서도 결정세액이 0이면 아무 효과가 없다. 세 조건이 서로 얽혀
// 있어서 공제율만 보고는 판단할 수 없다 — 그래서 '조금 더 썼을 때 결정세액이
// 실제로 얼마나 줄어드는가' 를 직접 계산해서 비교한다.

// 근로소득공제. 총급여 구간별 누진.
//
// 구간표를 그대로 노출한다 — 화면에 '어떻게 나온 값인지' 를 띄우려면 결과만으로는
// 부족하고, 설명을 따로 적어 두면 표를 고칠 때 설명이 조용히 어긋난다.
export const EARNED_BRACKETS = [
	{ upTo: 5000000, from: 0, base: 0, rate: 0.7, label: '500만원 이하' },
	{ upTo: 15000000, from: 5000000, base: 3500000, rate: 0.4, label: '500만 초과 1,500만 이하' },
	{ upTo: 45000000, from: 15000000, base: 7500000, rate: 0.15, label: '1,500만 초과 4,500만 이하' },
	{ upTo: 100000000, from: 45000000, base: 12000000, rate: 0.05, label: '4,500만 초과 1억 이하' },
	{ upTo: Infinity, from: 100000000, base: 14750000, rate: 0.02, label: '1억 초과' }
];

export const earnedIncomeBracket = (salary) => EARNED_BRACKETS.find(b => salary <= b.upTo);

export const earnedIncomeDeduction = (salary) => {
	const b = earnedIncomeBracket(salary);
	return Math.floor(Math.min(b.base + (salary - b.from) * b.rate, 20000000));
};

// 기본세율 (지방소득세 별도).
export const TAX_BRACKETS = [
	{ upTo: 14000000, rate: 0.06, progressive: 0, label: '1,400만원 이하' },
	{ upTo: 50000000, rate: 0.15, progressive: 1260000, label: '1,400만 초과 5,000만 이하' },
	{ upTo: 88000000, rate: 0.24, progressive: 5760000, label: '5,000만 초과 8,800만 이하' },
	{ upTo: 150000000, rate: 0.35, progressive: 15440000, label: '8,800만 초과 1.5억 이하' },
	{ upTo: 300000000, rate: 0.38, progressive: 19940000, label: '1.5억 초과 3억 이하' },
	{ upTo: 500000000, rate: 0.40, progressive: 25940000, label: '3억 초과 5억 이하' },
	{ upTo: 1000000000, rate: 0.42, progressive: 35940000, label: '5억 초과 10억 이하' },
	{ upTo: Infinity, rate: 0.45, progressive: 65940000, label: '10억 초과' }
];

export const taxBracket = (base) => TAX_BRACKETS.find(x => base <= x.upTo);

export const calculatedTax = (base) => {
	if (base <= 0) return 0;
	const b = taxBracket(base);
	return Math.floor(base * b.rate - b.progressive);
};

// 근로소득세액공제. 산출세액에 비례하되 총급여가 높을수록 한도가 깎인다.
export const earnedIncomeTaxCreditDetail = (calculated, salary) => {
	const raw = calculated <= 1300000
		? calculated * 0.55
		: 715000 + (calculated - 1300000) * 0.3;

	let limit;
	if (salary <= 33000000) limit = 740000;
	else if (salary <= 70000000) limit = Math.max(660000, 740000 - (salary - 33000000) * 0.008);
	else limit = Math.max(500000, 660000 - (salary - 70000000) * 0.5);

	return {
		raw: Math.floor(raw),
		limit: Math.floor(limit),
		credit: Math.floor(Math.min(raw, limit)),
		capped: raw > limit,
		rate: calculated <= 1300000 ? 0.55 : 0.3
	};
};

export const earnedIncomeTaxCredit = (calculated, salary) =>
	earnedIncomeTaxCreditDetail(calculated, salary).credit;

// 신용카드 등 사용금액 소득공제.
//
// 문턱은 공제율이 낮은 결제수단부터 차감한다. 신용카드를 먼저 태워야 공제율이
// 높은 현금영수증이 살아남는다 — 순서를 뒤집으면 공제액이 줄어든다.
export const cardDeduction = ({ salary, creditCard = 0, cashReceipt = 0 }) => {
	const threshold = Math.floor(salary * 0.25);
	const limit = salary <= 70000000 ? 3000000 : 2500000;
	const total = creditCard + cashReceipt;

	if (total <= threshold) {
		return { deduction: 0, threshold, limit, remainingToThreshold: threshold - total, capped: false };
	}

	let rest = threshold;
	const creditBurned = Math.min(creditCard, rest);
	rest -= creditBurned;
	const cashBurned = Math.min(cashReceipt, rest);

	const raw = (creditCard - creditBurned) * 0.15 + (cashReceipt - cashBurned) * 0.3;
	const deduction = Math.floor(Math.min(raw, limit));

	return {
		deduction,
		threshold,
		limit,
		remainingToThreshold: 0,
		capped: raw >= limit
	};
};

// 공제를 더 받으려면 얼마나 더 써야 하는지.
//
// 문턱(총급여 25%)을 넘기 전까지는 한 푼도 공제되지 않고, 한도에 닿으면 그 뒤로는
// 아무리 써도 늘지 않는다. 쓸 수 있는 구간이 그 사이뿐이라 두 지점까지 남은
// 금액을 결제수단별로 돌려준다 — 공제율이 달라서 필요한 금액도 두 배 차이난다.
export const spendingTargets = (input) => {
	const { salary = 0, creditCard = 0, cashReceipt = 0 } = input;
	const current = cardDeduction({ salary, creditCard, cashReceipt });
	const used = creditCard + cashReceipt;
	const toThreshold = Math.max(0, current.threshold - used);
	const headroom = Math.max(0, current.limit - current.deduction);

	// 문턱을 먼저 채우고, 그 뒤에 쓴 금액에만 공제율이 붙는다. 그래서 필요한
	// 총액은 '문턱까지 남은 금액 + 남은 공제액 ÷ 공제율' 이다.
	const deductionPartFor = (rate) => (headroom === 0 ? 0 : Math.ceil(headroom / rate));
	const totalFor = (rate) => (headroom === 0 ? 0 : toThreshold + deductionPartFor(rate));

	return {
		...current,
		used,
		toThreshold,
		headroom,
		// 두 값은 더하는 게 아니라 택일이다. 어느 결제수단으로 쓰느냐에 따라
		// 같은 공제를 받는 데 필요한 금액이 두 배 차이난다.
		byCashReceipt: totalFor(0.3),
		byCreditCard: totalFor(0.15),
		cashDeductionPart: deductionPartFor(0.3),
		creditDeductionPart: deductionPartFor(0.15)
	};
};

// 연금계좌 세액공제. 연금저축은 600만까지, IRP 를 합쳐 900만까지.
export const pensionTaxCredit = ({ salary, pensionSavings = 0, irp = 0 }) => {
	const savings = Math.min(pensionSavings, 6000000);
	const eligible = Math.min(savings + irp, 9000000);
	const rate = salary <= 55000000 ? 0.15 : 0.12;
	return { eligible, credit: Math.floor(eligible * rate), rate };
};

// 연말정산 한 번 돌리기. 결정세액과 중간 값들을 함께 돌려준다.
export const calcYearEndTax = (input) => {
	const {
		salary = 0,
		dependents = 1,
		pensionContribution = 0,
		healthInsurance = 0,
		creditCard = 0,
		cashReceipt = 0,
		pensionSavings = 0,
		irp = 0,
		otherDeduction = 0,
		otherTaxCredit = 0,
		withheldTax = 0
	} = input;

	const earnedDeduction = earnedIncomeDeduction(salary);
	const earnedIncome = Math.max(0, salary - earnedDeduction);

	const card = cardDeduction({ salary, creditCard, cashReceipt });
	const personal = dependents * 1500000;

	const totalDeduction = personal + pensionContribution + healthInsurance + card.deduction + otherDeduction;
	const taxBase = Math.max(0, earnedIncome - totalDeduction);
	const calculated = calculatedTax(taxBase);

	const pension = pensionTaxCredit({ salary, pensionSavings, irp });
	const earned = earnedIncomeTaxCreditDetail(calculated, salary);
	const earnedCredit = earned.credit;
	const totalCredit = earnedCredit + pension.credit + otherTaxCredit;

	const finalTax = Math.max(0, calculated - totalCredit);
	const wastedCredit = Math.max(0, totalCredit - calculated);

	return {
		salary,
		earnedDeduction,
		earnedBracket: earnedIncomeBracket(salary),
		earnedIncome,
		card,
		personal,
		totalDeduction,
		taxBase,
		taxRateBracket: taxBracket(taxBase),
		calculated,
		earnedCredit,
		earned,
		pension,
		totalCredit,
		finalTax,
		wastedCredit,
		refund: withheldTax - finalTax
	};
};

// 다음 1 원을 이 결제수단으로 쓰면 세금이 얼마나 줄어드는가.
//
// 세율만 곱해서는 답이 안 나온다. 문턱 미달, 한도 초과, 결정세액 0 — 어느
// 하나만 걸려도 효과가 0 이 되고, 문턱을 걸치는 구간에서는 일부만 효과가 있다.
// 그래서 실제로 STEP 만큼 더 썼다고 놓고 결정세액 차이를 본다.
const STEP = 100000;

export const marginalSaving = (input, method) => {
	const base = calcYearEndTax(input).finalTax;
	const key = method === 'cash' ? 'cashReceipt' : 'creditCard';
	const bumped = calcYearEndTax({ ...input, [key]: (input[key] || 0) + STEP });
	return (base - bumped.finalTax) / STEP;
};

// 한국 카드를 더 쓸지, 적립되는 미국 카드를 쓸지.
export const recommendCard = (input, usRewardRate = 0.03) => {
	const credit = marginalSaving(input, 'credit');
	const cash = marginalSaving(input, 'cash');
	const best = Math.max(credit, cash);
	const bestMethod = cash >= credit ? 'cash' : 'credit';

	return {
		creditRate: credit,
		cashRate: cash,
		bestKoreanRate: best,
		bestMethod,
		usRewardRate,
		winner: best > usRewardRate ? 'korea' : 'us',
		gap: Math.abs(best - usRewardRate)
	};
};
