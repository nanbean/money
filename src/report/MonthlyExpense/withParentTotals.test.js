import { withParentTotals } from './withParentTotals';

// month 배열은 12개월. 테스트는 필요한 달만 채운다.
const row = (category, months, sum) => ({
	category,
	month: Array.from({ length: 12 }, (_, i) => months[i] || 0),
	sum
});

describe('withParentTotals', () => {
	// 카테고리 뷰에서는 행 자체가 이미 상위 카테고리 총액이다.
	test('카테고리 뷰에서는 아무것도 넣지 않는다', () => {
		const report = [row('월급&보너스', [100], 100), row('기타 수입', [50], 50)];

		expect(withParentTotals(report, 'category')).toBe(report);
	});

	test('서브카테고리가 2개 이상이면 합계 행을 첫 자식 앞에 넣는다', () => {
		const report = [
			row('월급&보너스:기타', [10, 20], 30),
			row('월급&보너스:성과급', [100, 0], 100),
			row('월급&보너스:시간외수당', [1, 2], 3)
		];

		const out = withParentTotals(report, 'subcategory');

		expect(out.map(r => r.category)).toEqual([
			'월급&보너스',
			'월급&보너스:기타',
			'월급&보너스:성과급',
			'월급&보너스:시간외수당'
		]);
		expect(out[0].isParentTotal).toBe(true);
		expect(out[0].sum).toBe(133);
		expect(out[0].month[0]).toBe(111);
		expect(out[0].month[1]).toBe(22);
		expect(out[0].month[2]).toBe(0);
	});

	// 자식이 하나면 합계가 그 행과 같아서 행만 늘어난다.
	test('서브카테고리가 하나면 넣지 않는다', () => {
		const report = [row('자본 수익:배당', [80], 80)];

		expect(withParentTotals(report, 'subcategory')).toEqual(report);
	});

	test('서브카테고리가 없는 행에는 넣지 않는다', () => {
		const report = [row('대출이자', [100], 100), row('보험', [50], 50)];

		expect(withParentTotals(report, 'subcategory')).toEqual(report);
	});

	// 기존 정렬을 흔들지 않는 것이 이 방식의 핵심이다. 자식들은 이미 인접해 있으므로
	// 첫 자식 앞에만 끼워 넣으면 나머지 행 순서가 그대로 유지된다.
	test('원래 행 순서를 바꾸지 않는다', () => {
		const report = [
			row('가족:증여', [1], 1),
			row('가족:효도비', [2], 2),
			row('세금:소득세', [3], 3),
			row('세금:주민세', [4], 4),
			row('대출이자', [5], 5),
			row('보험', [6], 6)
		];

		const out = withParentTotals(report, 'subcategory');

		expect(out.map(r => r.category)).toEqual([
			'가족', '가족:증여', '가족:효도비',
			'세금', '세금:소득세', '세금:주민세',
			'대출이자', '보험'
		]);
	});

	test('상위 카테고리마다 합계 행은 한 번만 넣는다', () => {
		const report = [
			row('세금:소득세', [1], 1),
			row('세금:주민세', [2], 2),
			row('세금:재산세', [3], 3)
		];

		const out = withParentTotals(report, 'subcategory');

		expect(out.filter(r => r.isParentTotal)).toHaveLength(1);
		expect(out).toHaveLength(4);
	});

	test('지출(음수)도 그대로 합산한다', () => {
		const report = [
			row('식비:외식', [-1000], -1000),
			row('식비:장보기', [-2000], -2000)
		];

		const out = withParentTotals(report, 'subcategory');

		expect(out[0].sum).toBe(-3000);
		expect(out[0].month[0]).toBe(-3000);
	});

	// 합계 행은 원본 행을 건드리지 않아야 한다 — 원본이 totalIncomeSum 계산에도 쓰인다.
	test('원본 배열과 행 객체를 변경하지 않는다', () => {
		const report = [
			row('세금:소득세', [1], 1),
			row('세금:주민세', [2], 2)
		];
		const snapshot = JSON.parse(JSON.stringify(report));

		const out = withParentTotals(report, 'subcategory');

		expect(report).toEqual(snapshot);
		expect(report).toHaveLength(2);
		expect(out).not.toBe(report);
		// 원본 행에는 displayCategory 가 붙지 않는다
		expect(report[0].displayCategory).toBeUndefined();
	});

	// 첫 열이 140px 이라 '월급&보너스:시간외수당'(약 168px)은 잘렸다. 합계 행이 바로
	// 위에 있으면 접두어가 중복이므로 떼고, 가운데 정렬에서도 계층이 보이게 마커를 붙인다.
	describe('하위 라벨', () => {
		test('합계 행이 있는 자식은 접두어를 떼고 마커를 붙인다', () => {
			const report = [
				row('월급&보너스:기타', [10], 10),
				row('월급&보너스:시간외수당', [20], 20)
			];

			const out = withParentTotals(report, 'subcategory');

			expect(out[0].displayCategory).toBeUndefined();   // 합계 행은 그대로
			expect(out[0].category).toBe('월급&보너스');
			expect(out[1].displayCategory).toBe('└ 기타');
			expect(out[2].displayCategory).toBe('└ 시간외수당');
		});

		test('드릴다운 키인 category 는 전체 이름을 유지한다', () => {
			const report = [
				row('세금:소득세', [1], 1),
				row('세금:주민세', [2], 2)
			];

			const out = withParentTotals(report, 'subcategory');

			expect(out[1].category).toBe('세금:소득세');
			expect(out[2].category).toBe('세금:주민세');
		});

		// 합계 행이 없으면 접두어를 떼는 순간 어느 상위 소속인지 알 수 없다.
		test('합계 행이 없는 자식은 전체 이름을 유지한다', () => {
			const report = [row('자본 수익:배당', [80], 80)];

			const out = withParentTotals(report, 'subcategory');

			expect(out[0].displayCategory).toBeUndefined();
			expect(out[0].category).toBe('자본 수익:배당');
		});

		test('하위 이름에 콜론이 더 있어도 첫 구분자만 뗀다', () => {
			const report = [
				row('a:b:c', [1], 1),
				row('a:d', [2], 2)
			];

			const out = withParentTotals(report, 'subcategory');

			expect(out[0].category).toBe('a');
			expect(out[1].displayCategory).toBe('└ b:c');
			expect(out[2].displayCategory).toBe('└ d');
		});
	});

	test('빈 입력과 month 누락을 견딘다', () => {
		expect(withParentTotals([], 'subcategory')).toEqual([]);
		expect(withParentTotals(undefined, 'subcategory')).toEqual([]);

		const noMonth = [
			{ category: '세금:소득세', sum: 1 },
			{ category: '세금:주민세', sum: 2 }
		];
		const out = withParentTotals(noMonth, 'subcategory');
		expect(out[0].sum).toBe(3);
		expect(out[0].month).toEqual([]);
	});
});
