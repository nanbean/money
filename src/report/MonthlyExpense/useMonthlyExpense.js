import moment from 'moment';

import { MONTH_LIST } from '../../constants';

const getStartDate = (year, month) => {
	return moment(`${year}-${month.toString().padStart(2, '0')}-01`).format('YYYY-MM-DD');
};

const getEndDate = (year, month) => {
	return moment(`${year}-${month.toString().padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
};

const useMonthlyExpense = (incomeReport, expenseReport, totalMonthIncomeSum, totalIncomeSum, totalMonthExpenseSum, totalExpenseSum, year) => {
	let reportData = [];

	reportData = [
		[
			{
				type: 'label',
				value: 'Category'
			},
			...MONTH_LIST.map((_, index) => ({
				type: 'label',
				value: moment().month(index).format('MMM'),
				startDate: getStartDate(year, index + 1),
				endDate: getEndDate(year, index + 1)
			})),
			{
				type: 'label',
				value: 'Total'
			}
		]
	];

	if (incomeReport.length > 0 ) {
		reportData = [
			...reportData,
			...incomeReport.map(i => {
				// 상위 카테고리 합계 행 (아래 섹션 총계와 구분되게 스타일링한다).
				const totalRow = !!i.isParentTotal;
				return [
					{
						// 음영은 섹션 총계(총수입/총지출)에만 쓴다. 상위 카테고리 행은
						// '총계'가 아니라 '그룹 머리글'로 읽혀야 한다 — 머리글은 위,
						// 총계는 아래라야 방향이 어긋나지 않는다.
						//
						// 굵게만으로는 촘촘한 표에서 눈에 띄지 않아서, 위쪽 구분선과
						// 카테고리 색점을 함께 쓴다. 다크 모드는 surface(#15151c)와
						// 총계 음영(#1f1f28) 사이 간격이 좁아 음영 단계로는 약하다.
						groupHeader: totalRow,
						// 색점은 '카테고리 식별' 표시다. 상위 카테고리 행이면 모두 붙는다
						// (하위가 있든 없든 — 대출이자·보험도 카테고리다).
						// 하위 행은 '└' 로 표시하므로 점을 붙이지 않는다 — 표시 하나가
						// 한 가지 뜻만 갖게 한다.
						type: 'label',
						category: i.displayCategory ? undefined : i.category,
						isParentTotal: totalRow,
						// displayCategory 가 있으면 합계 행 아래의 자식이다 — 한 칸 들여쓴다.
						indent: !!i.displayCategory,
						// 화면 라벨만 짧게. 드릴다운은 아래 셀들의 category 를 쓴다.
						value: i.displayCategory || i.category
					},
					// kind: 드릴다운 팝업이 수입/지출 중 어느 거래 목록에서 찾을지 판단한다.
					...i.month.map((j, index) => ({
						groupHeader: totalRow,
						isParentTotal: totalRow,
						kind: 'income',
						category: i.category,
						value: j,
						startDate: getStartDate(year, index + 1),
						endDate: getEndDate(year, index + 1)
					})),
					{
						groupHeader: totalRow,
						isParentTotal: totalRow,
						kind: 'income',
						category: i.category,
						value: i.sum,
						startDate: getStartDate(year, 1),
						endDate: getEndDate(year, 12)
					}
				];
			}),
			[
				{
					cellColor: true,
					type: 'label',
					value: '총수입'
				},
				...totalMonthIncomeSum.map(i => ({
					cellColor: true,
					value: i
				})),
				{
					cellColor: true,
					value: totalIncomeSum
				}
			]
		];
	}
	if (expenseReport.length > 0 ) {
		reportData = [
			...reportData,
			...expenseReport.map(i => {
				const totalRow = !!i.isParentTotal;
				return [
					{
						// 음영은 섹션 총계(총수입/총지출)에만 쓴다. 상위 카테고리 행은
						// '총계'가 아니라 '그룹 머리글'로 읽혀야 한다 — 머리글은 위,
						// 총계는 아래라야 방향이 어긋나지 않는다.
						//
						// 굵게만으로는 촘촘한 표에서 눈에 띄지 않아서, 위쪽 구분선과
						// 카테고리 색점을 함께 쓴다. 다크 모드는 surface(#15151c)와
						// 총계 음영(#1f1f28) 사이 간격이 좁아 음영 단계로는 약하다.
						groupHeader: totalRow,
						// 색점은 '카테고리 식별' 표시다. 상위 카테고리 행이면 모두 붙는다
						// (하위가 있든 없든 — 대출이자·보험도 카테고리다).
						// 하위 행은 '└' 로 표시하므로 점을 붙이지 않는다 — 표시 하나가
						// 한 가지 뜻만 갖게 한다.
						type: 'label',
						category: i.displayCategory ? undefined : i.category,
						isParentTotal: totalRow,
						// displayCategory 가 있으면 합계 행 아래의 자식이다 — 한 칸 들여쓴다.
						indent: !!i.displayCategory,
						// 화면 라벨만 짧게. 드릴다운은 아래 셀들의 category 를 쓴다.
						value: i.displayCategory || i.category
					},
					...i.month.map((j, index) => ({
						groupHeader: totalRow,
						isParentTotal: totalRow,
						kind: 'expense',
						category: i.category,
						value: j,
						startDate: getStartDate(year, index + 1),
						endDate: getEndDate(year, index + 1)
					})),
					{
						groupHeader: totalRow,
						isParentTotal: totalRow,
						kind: 'expense',
						category: i.category,
						value: i.sum,
						startDate: getStartDate(year, 1),
						endDate: getEndDate(year, 12)
					}
				];
			}),
			[
				{
					cellColor: true,
					type: 'label',
					value: '총지출'
				},
				...totalMonthExpenseSum.map(i => ({
					cellColor: true,
					value: i
				})),
				{
					cellColor: true,
					value: totalExpenseSum
				}
			]
		];
	}

	return reportData;
};

export default useMonthlyExpense;