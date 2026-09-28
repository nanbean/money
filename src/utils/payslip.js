// 급여명세(거래의 division)에서 연말정산에 쓸 값을 뽑고, 남은 달을 추정한다.
//
// 연중에 실적만 더하면 총급여가 실제보다 작게 나온다. 그러면 신용카드 공제의
// 최저사용금액(총급여 25%) 문턱이 낮게 잡혀 '이미 공제 구간' 이라는 반대
// 결론이 나온다. 그래서 마지막 명세를 기준으로 남은 달을 채워 넣는다.

// 비과세 수당. 세법상 총급여에서 빼야 한다.
const NON_TAXABLE = /정액급식비|교원연구비/;

// 매달 나오지 않는 지급 항목. 남은 달 추정에 이걸 끼우면 명절휴가비가
// 12월까지 매달 들어오는 것으로 계산된다.
//
// '정근수당가산금' 은 매달 나오는 정기 수당이라 남겨야 해서 ^정근수당$ 로 묶는다.
const IRREGULAR_PAY = /명절휴가비|성과상여|성과급|시점상여|^정근수당$|연가보상/;

// 정산성 공제. 복직·연말정산 정산분은 그 달에만 있는 일회성이다.
const ONE_OFF_DEDUCTION = /정산|과미납/;

// 지방소득세. 소득세의 10% 로 따로 매겨지고 따로 환급된다.
const LOCAL_TAX = /지방/;

const monthOf = (date) => parseInt(String(date).slice(5, 7), 10);

// 한 해의 명세를 모아 실적과 마지막 달의 정기분을 함께 돌려준다.
export const collectPayslips = (transactions, payee) => {
	const slips = (transactions || [])
		.filter(t => t.payee === payee && Array.isArray(t.division))
		.sort((a, b) => String(a.date).localeCompare(String(b.date)));

	const actual = {
		gross: 0,
		nonTaxable: 0,
		pensionContribution: 0,
		healthInsurance: 0,
		withheldTax: 0,
		localTax: 0
	};

	slips.forEach(t => {
		t.division.forEach(d => {
			const desc = d.description || '';
			if (d.amount > 0) {
				actual.gross += d.amount;
				if (NON_TAXABLE.test(desc)) actual.nonTaxable += d.amount;
			} else {
				const v = -d.amount;
				if (d.subcategory === '공무원연금') actual.pensionContribution += v;
				else if (d.subcategory === '건강보험') actual.healthInsurance += v;
				// 소득세와 지방소득세가 같은 subcategory 로 들어온다. 합쳐 버리면
				// 결정세액(소득세)과 기납부세액의 기준이 달라져 환급액이 부풀려진다.
				else if (d.subcategory === '소득세') {
					if (LOCAL_TAX.test(desc)) actual.localTax += v;
					else actual.withheldTax += v;
				}
			}
		});
	});

	// 같은 달에 급여와 상여가 따로 들어오기도 한다. 마지막 달 전체를 봐야
	// 그 달의 정기분을 제대로 집계한다.
	const lastMonth = slips.length ? monthOf(slips[slips.length - 1].date) : 0;
	const lastSlips = slips.filter(t => monthOf(t.date) === lastMonth);

	const monthly = { taxableSalary: 0, pensionContribution: 0, healthInsurance: 0, withheldTax: 0, localTax: 0 };

	lastSlips.forEach(t => {
		t.division.forEach(d => {
			const desc = d.description || '';
			if (d.amount > 0) {
				if (IRREGULAR_PAY.test(desc)) return;
				if (NON_TAXABLE.test(desc)) return;
				monthly.taxableSalary += d.amount;
			} else {
				if (ONE_OFF_DEDUCTION.test(desc)) return;
				const v = -d.amount;
				if (d.subcategory === '공무원연금') monthly.pensionContribution += v;
				else if (d.subcategory === '건강보험') monthly.healthInsurance += v;
				else if (d.subcategory === '소득세') {
					if (LOCAL_TAX.test(desc)) monthly.localTax += v;
					else monthly.withheldTax += v;
				}
			}
		});
	});

	// 명절휴가비는 설·추석 두 번이다. 월 정기분에 섞을 수 없고, 빼 버리면
	// 연 480만원쯤이 통째로 빠져 내년 추정이 크게 낮아진다. 한 번분 금액만
	// 따로 들고 있다가 연 2회로 환산한다.
	let holidayBonusOnce = 0;
	slips.forEach(t => {
		t.division.forEach(d => {
			if (d.amount > 0 && /명절휴가비/.test(d.description || '')) {
				holidayBonusOnce = Math.max(holidayBonusOnce, d.amount);
			}
		});
	});

	return {
		count: slips.length,
		lastMonth,
		holidayBonusOnce,
		actual: { ...actual, taxableSalary: Math.max(0, actual.gross - actual.nonTaxable) },
		monthly
	};
};

// 내년 추정. 올해 실적을 그대로 쓰면 안 된다 — 중간에 복직했다면 올해 총급여는
// 반년치라 내년보다 훨씬 작고, 그 값으로 문턱(총급여 25%)을 잡으면 카드를 얼마나
// 써야 하는지가 완전히 빗나간다.
//
// 그래서 마지막 명세의 월 정기분을 12개월로 펴고, 명절휴가비를 연 2회로 붙인 뒤
// 인상률을 곱한다. 정근수당·성과상여는 올해 명세에 없어 넣지 못한다.
export const projectNextYear = (collected, raiseRate = 0.03) => {
	const { monthly, holidayBonusOnce, count } = collected;
	if (count === 0) {
		return { salary: 0, pensionContribution: 0, healthInsurance: 0, withheldTax: 0, localTax: 0, raiseRate };
	}

	const grow = (n) => Math.round(n * (1 + raiseRate));

	return {
		salary: grow(monthly.taxableSalary * 12 + holidayBonusOnce * 2),
		pensionContribution: grow(monthly.pensionContribution * 12),
		healthInsurance: grow(monthly.healthInsurance * 12),
		// 아직 받지도 않은 급여라 낸 세금도 없다. 12개월치로 펴서 넣으면 내지도
		// 않은 세금을 환급받는 것으로 나온다.
		withheldTax: 0,
		localTax: 0,
		// 참고용. 내년에 이만큼 원천징수될 것으로 보인다는 뜻이지 기납부가 아니다.
		expectedWithholding: grow(monthly.withheldTax * 12),
		monthlyBase: monthly.taxableSalary,
		holidayBonus: holidayBonusOnce * 2,
		raiseRate
	};
};

// 실적 + 남은 달 추정. 마지막 명세가 있는 달까지는 실적이고 그 뒤는 추정이다.
export const projectAnnual = (collected, throughMonth = 12) => {
	const { actual, monthly, lastMonth, count } = collected;
	const remaining = count === 0 ? 0 : Math.max(0, throughMonth - lastMonth);

	return {
		remaining,
		salary: actual.taxableSalary + monthly.taxableSalary * remaining,
		pensionContribution: actual.pensionContribution + monthly.pensionContribution * remaining,
		healthInsurance: actual.healthInsurance + monthly.healthInsurance * remaining,
		withheldTax: actual.withheldTax + monthly.withheldTax * remaining,
		localTax: actual.localTax + monthly.localTax * remaining
	};
};
