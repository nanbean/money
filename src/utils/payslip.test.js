import { collectPayslips, projectAnnual, projectNextYear } from './payslip';

// 실측 명세다. 2026년 오은미(교사) — 1~6월 해외 무급, 7/21 복직.
// 8월에는 7월 일할분과 복직 정산이 함께 실렸고, 9월에는 추석 명절휴가비가 있다.
const AUG = {
	date: '2026-08-14',
	payee: '오은미월급',
	amount: 4085150,
	division: [
		{ category: '월급&보너스', subcategory: '월급', description: '본봉', amount: 5415960 },
		{ category: '월급&보너스', subcategory: '기타', description: '정근수당가산금', amount: 81290 },
		{ category: '월급&보너스', subcategory: '기타', description: '정액급식비', amount: 216770 },
		{ category: '월급&보너스', subcategory: '기타', description: '교직수당', amount: 338700 },
		{ category: '월급&보너스', subcategory: '기타', description: '가족수당(배우자)', amount: 54190 },
		{ category: '월급&보너스', subcategory: '기타', description: '가족수당(자녀)', amount: 176120 },
		{ category: '월급&보너스', subcategory: '시간외수당', description: '시간외근무수당(정액분)', amount: 37900 },
		{ category: '월급&보너스', subcategory: '기타', description: '교원연구비(유.초등5년이상)', amount: 81290 },
		{ category: '세금', subcategory: '소득세', description: '소득세', amount: -422860 },
		{ category: '세금', subcategory: '소득세', description: '지방소득세', amount: -42280 },
		{ category: '세금', subcategory: '공무원연금', description: '일반기여금', amount: -520400 },
		{ category: '세금', subcategory: '공무원연금', description: '일반과미납금', amount: -520400 },
		{ category: '세금', subcategory: '건강보험', description: '건강보험', amount: -262430 },
		{ category: '세금', subcategory: '건강보험', description: '노인장기요양보험', amount: -34480 },
		{ category: '세금', subcategory: '건강보험', description: '장기요양복직정산', amount: -45880 },
		{ category: '세금', subcategory: '건강보험', description: '건강보험복직정산', amount: -368760 }
	]
};

const SEP = {
	date: '2026-09-17',
	payee: '오은미월급',
	amount: 5952490,
	division: [
		{ category: '월급&보너스', subcategory: '월급', description: '본봉', amount: 3997500 },
		{ category: '월급&보너스', subcategory: '기타', description: '정근수당가산금', amount: 60000 },
		{ category: '월급&보너스', subcategory: '기타', description: '정액급식비', amount: 160000 },
		{ category: '월급&보너스', subcategory: '기타', description: '교직수당', amount: 250000 },
		{ category: '월급&보너스', subcategory: '기타', description: '가족수당(배우자)', amount: 40000 },
		{ category: '월급&보너스', subcategory: '기타', description: '가족수당(자녀)', amount: 130000 },
		{ category: '월급&보너스', subcategory: '시간외수당', description: '시간외근무수당(정액분)', amount: 66320 },
		{ category: '월급&보너스', subcategory: '기타', description: '교원연구비(유.초등5년이상)', amount: 60000 },
		{ category: '월급&보너스', subcategory: '월급', description: '명절휴가비', amount: 2398500 },
		{ category: '세금', subcategory: '소득세', description: '소득세', amount: -239200 },
		{ category: '세금', subcategory: '소득세', description: '지방소득세', amount: -23920 },
		{ category: '세금', subcategory: '공무원연금', description: '일반기여금', amount: -520400 },
		{ category: '세금', subcategory: '건강보험', description: '건강보험', amount: -262430 },
		{ category: '세금', subcategory: '건강보험', description: '노인장기요양보험', amount: -34480 }
	]
};

const OTHER = { date: '2026-09-23', payee: '월급', amount: 8477000, division: [] };

describe('collectPayslips', () => {
	it('다른 사람의 급여는 섞지 않는다', () => {
		expect(collectPayslips([AUG, SEP, OTHER], '오은미월급').count).toBe(2);
	});

	it('division 이 없는 거래는 무시한다', () => {
		expect(collectPayslips([{ date: '2026-08-14', payee: '오은미월급', amount: 1 }], '오은미월급').count).toBe(0);
	});

	it('총 지급액에서 비과세를 빼 총급여를 낸다', () => {
		const { actual } = collectPayslips([AUG, SEP], '오은미월급');
		expect(actual.gross).toBe(13564540);
		// 정액급식비 376,770 + 교원연구비 141,290
		expect(actual.nonTaxable).toBe(518060);
		expect(actual.taxableSalary).toBe(13046480);
	});

	it('공제를 항목별로 모은다', () => {
		const { actual } = collectPayslips([AUG, SEP], '오은미월급');
		expect(actual.pensionContribution).toBe(1561200);
		expect(actual.healthInsurance).toBe(1008460);
	});

	// 둘 다 subcategory 가 '소득세' 로 들어온다. 합쳐서 기납부세액으로 쓰면
	// 결정세액(소득세)과 기준이 달라져 환급액이 10% 부풀려진다.
	it('소득세와 지방소득세를 나눈다', () => {
		const { actual } = collectPayslips([AUG, SEP], '오은미월급');
		expect(actual.withheldTax).toBe(662060);
		expect(actual.localTax).toBe(66200);
		expect(actual.withheldTax + actual.localTax).toBe(728260);
	});

	// 명절휴가비를 정기분에 넣으면 10~12월에도 매달 받는 것으로 계산된다.
	it('마지막 달 정기분에서 명절휴가비를 뺀다', () => {
		const { monthly, lastMonth } = collectPayslips([AUG, SEP], '오은미월급');
		expect(lastMonth).toBe(9);
		// 9월 지급 합계에서 명절휴가비와 비과세(급식비·연구비)를 뺀 값
		expect(monthly.taxableSalary).toBe(4543820);
	});

	// 복직정산·과미납금은 그 달 한 번뿐이다. 남은 달에 반복시키면 안 된다.
	it('정산성 공제는 정기분에서 뺀다', () => {
		const { monthly } = collectPayslips([AUG, SEP], '오은미월급');
		expect(monthly.pensionContribution).toBe(520400);
		expect(monthly.healthInsurance).toBe(296910);
	});

	it('명세가 없으면 0 으로 돌려준다', () => {
		const c = collectPayslips([], '오은미월급');
		expect(c.count).toBe(0);
		expect(c.lastMonth).toBe(0);
		expect(c.actual.taxableSalary).toBe(0);
	});
});

describe('projectAnnual', () => {
	// 손으로 계산한 연간 추정치와 맞아야 한다. 기여금·건강보험은 정액이라
	// 앞서 명세로 직접 계산한 값과 정확히 일치한다.
	it('마지막 명세 기준으로 남은 달을 채운다', () => {
		const p = projectAnnual(collectPayslips([AUG, SEP], '오은미월급'));
		expect(p.remaining).toBe(3);
		expect(p.salary).toBe(26677940);
		expect(p.pensionContribution).toBe(3122400);
		expect(p.healthInsurance).toBe(1899190);
		// 9월 소득세 239,200 / 지방소득세 23,920 을 3개월 더한다.
		expect(p.withheldTax).toBe(1379660);
		expect(p.localTax).toBe(137960);
	});

	it('12월 명세까지 있으면 추정하지 않는다', () => {
		const dec = { ...SEP, date: '2026-12-17' };
		const p = projectAnnual(collectPayslips([dec], '오은미월급'));
		expect(p.remaining).toBe(0);
	});

	it('명세가 없으면 추정도 0', () => {
		const p = projectAnnual(collectPayslips([], '오은미월급'));
		expect(p.remaining).toBe(0);
		expect(p.salary).toBe(0);
	});

	it('기준 월을 좁히면 추정 구간도 줄어든다', () => {
		const p = projectAnnual(collectPayslips([AUG, SEP], '오은미월급'), 10);
		expect(p.remaining).toBe(1);
	});
});

describe('projectNextYear', () => {
	const collected = collectPayslips([AUG, SEP], '오은미월급');

	it('명절휴가비 한 번분을 집어낸다', () => {
		expect(collected.holidayBonusOnce).toBe(2398500);
	});

	// 올해는 7월 복직이라 총급여가 반년치뿐이다. 그 값을 내년에 쓰면 문턱이
	// 절반으로 잡혀 '얼마 써야 하나' 가 통째로 빗나간다.
	it('12개월 만근 + 명절휴가비 2회 + 인상률로 계산한다', () => {
		const n = projectNextYear(collected, 0.03);
		// (4,543,820 × 12 + 2,398,500 × 2) × 1.03
		expect(n.salary).toBe(Math.round((4543820 * 12 + 2398500 * 2) * 1.03));
		expect(n.salary).toBeGreaterThan(60000000);
	});

	it('올해 실적(반년치)보다 두 배 넘게 크다', () => {
		const thisYear = projectAnnual(collected);
		expect(projectNextYear(collected, 0.03).salary).toBeGreaterThan(thisYear.salary * 2);
	});

	it('공제도 12개월치로 편다', () => {
		const n = projectNextYear(collected, 0.03);
		expect(n.pensionContribution).toBe(Math.round(520400 * 12 * 1.03));
		expect(n.healthInsurance).toBe(Math.round(296910 * 12 * 1.03));
	});

	// 아직 받지 않은 급여라 낸 세금도 없다. 12개월치를 넣으면 내지도 않은
	// 세금을 환급받는 것으로 계산된다.
	it('기납부세액은 0 이고 예상 원천징수액만 따로 준다', () => {
		const n = projectNextYear(collected, 0.03);
		expect(n.withheldTax).toBe(0);
		expect(n.localTax).toBe(0);
		expect(n.expectedWithholding).toBe(Math.round(239200 * 12 * 1.03));
	});

	it('인상률 0 이면 그대로 12개월치', () => {
		const n = projectNextYear(collected, 0);
		expect(n.salary).toBe(4543820 * 12 + 2398500 * 2);
	});

	it('명세가 없으면 0', () => {
		expect(projectNextYear(collectPayslips([], '오은미월급')).salary).toBe(0);
	});
});
