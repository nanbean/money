import { buildSankeyData, NON_LIVING_NODE } from './useSankeyData';

// 총계는 실제 화면과 같은 방식으로 리포트에서 도출한다.
// exemptExpenseSum 은 '생활비만 보기' 로 화면에서 빠진 지출 합계 (음수).
const build = (incomeReport, expenseReport, exemptExpenseSum = 0) => buildSankeyData(
	incomeReport,
	expenseReport,
	incomeReport.reduce((s, r) => s + r.sum, 0),
	expenseReport.reduce((s, r) => s + r.sum, 0),
	exemptExpenseSum
);

const links = (data) => data.slice(1); // 첫 행은 ['From','To','Weight'] 헤더
const linkTo = (data, source, target) => links(data).find(([s, t]) => s === source && t === target);

// Sankey 의 핵심 불변식: 유입과 유출이 모두 있는 노드는 두 값이 같아야 한다.
const flowBalance = (data) => {
	const inSum = {}, outSum = {};
	links(data).forEach(([s, t, v]) => {
		outSum[s] = (outSum[s] || 0) + v;
		inSum[t] = (inSum[t] || 0) + v;
	});
	const unbalanced = [];
	Object.keys(inSum).forEach(node => {
		if (outSum[node] === undefined) return; // 종착 노드
		if (Math.abs(inSum[node] - outSum[node]) > 0.01) {
			unbalanced.push({ node, in: inSum[node], out: outSum[node] });
		}
	});
	return unbalanced;
};

const row = (category, sum) => ({ category, sum });

describe('useSankeyData', () => {
	test('수입도 지출도 없으면 빈 배열', () => {
		expect(build([], [])).toEqual([]);
	});

	describe('흑자', () => {
		const income = [row('월급&보너스:월급', 1000), row('기타 수입', 500)];
		const expense = [row('식비:외식', -300), row('보험', -200)];

		test('흐름이 균형을 이룬다', () => {
			expect(flowBalance(build(income, expense))).toEqual([]);
		});

		test('지출과 저축으로 나눠 흘려보낸다', () => {
			const data = build(income, expense);

			expect(linkTo(data, 'Income', 'Expenses')[2]).toBe(500);
			expect(linkTo(data, 'Income', 'Savings')[2]).toBe(1000);
			expect(linkTo(data, 'Deficit', 'Expenses')).toBeUndefined();
		});

		test('상위 카테고리를 거쳐 하위로 내려간다', () => {
			const data = build(income, expense);

			// 지출: Expenses -> 식비 -> 식비:외식
			expect(linkTo(data, 'Expenses', '식비')[2]).toBe(300);
			expect(linkTo(data, '식비', '식비:외식')[2]).toBe(300);
			// 서브카테고리가 없으면 Expenses 에서 바로
			expect(linkTo(data, 'Expenses', '보험')[2]).toBe(200);
			// 수입: 월급&보너스 -> 월급&보너스:월급 -> Income
			expect(linkTo(data, '월급&보너스', '월급&보너스:월급')[2]).toBe(1000);
			expect(linkTo(data, '월급&보너스:월급', 'Income')[2]).toBe(1000);
		});
	});

	// 예전에는 savings 가 음수면 'Income -> Savings' 만 생략했다. 지출 전액이
	// Income 에서 나가 유출 > 유입이 되고, 적자는 화면에서 사라졌다.
	describe('적자 (지출 > 수입)', () => {
		const income = [row('월급&보너스:월급', 1000)];
		const expense = [row('식비:외식', -1500)];

		test('흐름이 균형을 이룬다', () => {
			expect(flowBalance(build(income, expense))).toEqual([]);
		});

		test('수입은 전액 지출로 가고 부족분은 Deficit 에서 들어온다', () => {
			const data = build(income, expense);

			expect(linkTo(data, 'Income', 'Expenses')[2]).toBe(1000);
			expect(linkTo(data, 'Deficit', 'Expenses')[2]).toBe(500);
			expect(linkTo(data, 'Income', 'Savings')).toBeUndefined();
		});

		test('Expenses 유입이 지출 총액과 같다', () => {
			const data = build(income, expense);
			const into = links(data)
				.filter(([, t]) => t === 'Expenses')
				.reduce((s, [, , v]) => s + v, 0);

			expect(into).toBe(1500);
		});
	});

	// 수입이 하나도 없는 해. 예전에는 'Income -> Expenses' 자체가 빠져서
	// Expenses 가 유입 없이 유출만 갖는 상태가 됐다.
	describe('수입 없음', () => {
		const expense = [row('식비:외식', -800)];

		test('흐름이 균형을 이룬다', () => {
			expect(flowBalance(build([], expense))).toEqual([]);
		});

		test('전액을 Deficit 에서 받는다', () => {
			const data = build([], expense);

			expect(linkTo(data, 'Deficit', 'Expenses')[2]).toBe(800);
			expect(linkTo(data, 'Income', 'Expenses')).toBeUndefined();
		});
	});

	describe('지출 없음', () => {
		const income = [row('기타 수입', 700)];

		test('전액이 저축으로 간다', () => {
			const data = build(income, []);

			expect(linkTo(data, 'Income', 'Savings')[2]).toBe(700);
			expect(linkTo(data, 'Income', 'Expenses')).toBeUndefined();
			expect(flowBalance(data)).toEqual([]);
		});
	});

	describe('수입 = 지출', () => {
		test('저축도 적자도 만들지 않는다', () => {
			const data = build([row('기타 수입', 500)], [row('보험', -500)]);

			expect(linkTo(data, 'Income', 'Expenses')[2]).toBe(500);
			expect(linkTo(data, 'Income', 'Savings')).toBeUndefined();
			expect(linkTo(data, 'Deficit', 'Expenses')).toBeUndefined();
			expect(flowBalance(data)).toEqual([]);
		});
	});

	// '생활비만 보기' 는 세금·보험·대출이자를 표에서 뺀다. 그 돈이 저축된 것은
	// 아니므로 별도 흐름으로 그린다 — 예전에는 Savings 에 흡수돼 부풀었다.
	describe('생활비만 보기 (생활비 외 지출 분리)', () => {
		const income = [row('기타 수입', 1000)];
		const living = [row('식비:외식', -300)];
		const exempt = -500; // 세금·보험 등

		test('흐름이 균형을 이룬다', () => {
			expect(flowBalance(build(income, living, exempt))).toEqual([]);
		});

		test('생활비 외 지출을 별도 노드로 흘려보낸다', () => {
			const data = build(income, living, exempt);

			expect(linkTo(data, 'Income', NON_LIVING_NODE)[2]).toBe(500);
			expect(linkTo(data, 'Income', 'Expenses')[2]).toBe(300);
			// 1000 - 500 - 300 = 200. 예전에는 700 (생활비 외 지출을 저축으로 셌다)
			expect(linkTo(data, 'Income', 'Savings')[2]).toBe(200);
		});

		test('생활비만 보기가 아니면 노드를 만들지 않는다', () => {
			const data = build(income, living);

			expect(linkTo(data, 'Income', NON_LIVING_NODE)).toBeUndefined();
			expect(linkTo(data, 'Income', 'Savings')[2]).toBe(700);
		});

		test('수입이 전체 지출보다 적으면 부족분을 Deficit 이 메운다', () => {
			// 수입 1000 < 생활비 외 500 + 생활비 800 = 1300
			const data = build(income, [row('식비:외식', -800)], exempt);

			expect(flowBalance(data)).toEqual([]);
			// 고정성 지출을 먼저 채운다
			expect(linkTo(data, 'Income', NON_LIVING_NODE)[2]).toBe(500);
			expect(linkTo(data, 'Income', 'Expenses')[2]).toBe(500);
			expect(linkTo(data, 'Deficit', 'Expenses')[2]).toBe(300);
			expect(linkTo(data, 'Income', 'Savings')).toBeUndefined();
		});

		test('수입이 생활비 외 지출도 못 덮으면 그쪽에도 Deficit 이 붙는다', () => {
			const data = build([row('기타 수입', 200)], [row('식비:외식', -300)], exempt);

			expect(flowBalance(data)).toEqual([]);
			expect(linkTo(data, 'Income', NON_LIVING_NODE)[2]).toBe(200);
			expect(linkTo(data, 'Deficit', NON_LIVING_NODE)[2]).toBe(300);
			expect(linkTo(data, 'Income', 'Expenses')).toBeUndefined();
			expect(linkTo(data, 'Deficit', 'Expenses')[2]).toBe(300);
		});
	});

	test('같은 상위 카테고리의 하위 지출을 합쳐 Expenses 에 연결한다', () => {
		const data = build(
			[row('기타 수입', 10000)],
			[row('세금:소득세', -300), row('세금:주민세', -200), row('세금:재산세', -100)]
		);

		expect(linkTo(data, 'Expenses', '세금')[2]).toBe(600);
		expect(flowBalance(data)).toEqual([]);
	});
});
