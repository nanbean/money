import moment from 'moment';

import weeklyTransactions from './weeklyTransactions';
import * as actions from '../actions/actionTypes';

// 거래 _id 는 'YYYY-MM-DD:계좌명:uuid' 지만 불변이고, 거래 날짜는 편집 가능하다.
// 실제 데이터에 132건(0.5%)의 어긋남이 있고 최근 건은 ±1~2일이다.
//
// getWeeklyTransactions 는 _id 창을 넉넉히 잡아 적재하고, 실제 범위 판정을 이
// 리듀서에 맡긴다. 그래서 이 리듀서가 date 필드로 걸러야 한다는 것이 그 수정의
// 전제다 — _id 를 믿도록 바꾸면 주 경계의 거래가 다시 누락된다.
const day = (offset) => moment().add(offset, 'days').format('YYYY-MM-DD');

const tx = ({ id, date, account = 'account:CCard:생활비카드' }) => ({
	_id: id,
	date,
	accountId: account,
	amount: -1000
});

const load = (payload) => weeklyTransactions([], { type: actions.SET_WEEKLY_TRANSACTIONS, payload });
const ids = (state) => state.map(t => t._id);

describe('weeklyTransactions', () => {
	test('최근 1주의 거래를 담는다', () => {
		const state = load([
			tx({ id: `${day(-3)}:생활비카드:a`, date: day(-3) }),
			tx({ id: `${day(-30)}:생활비카드:b`, date: day(-30) })
		]);

		expect(ids(state)).toEqual([`${day(-3)}:생활비카드:a`]);
	});

	// 이게 핵심이다. _id 는 주 밖인데 date 는 주 안이다. 실측 예:
	// _id 2026-07-26:생활비카드:... / date=2026-07-27
	test('_id 가 주 밖이어도 date 가 주 안이면 담는다', () => {
		const state = load([
			tx({ id: `${day(-40)}:생활비카드:drifted`, date: day(-2) })
		]);

		expect(ids(state)).toEqual([`${day(-40)}:생활비카드:drifted`]);
	});

	// 반대 방향. _id 가 미래로 밀린 경우 — 실측 예:
	// _id 2026-07-25:삼성카드:... / date=2026-07-24, 그날이 '오늘'
	test('_id 가 미래여도 date 가 주 안이면 담는다', () => {
		const state = load([
			tx({ id: `${day(+40)}:삼성카드:ahead`, date: day(0) })
		]);

		expect(ids(state)).toEqual([`${day(+40)}:삼성카드:ahead`]);
	});

	test('_id 가 주 안이어도 date 가 주 밖이면 버린다', () => {
		const state = load([
			tx({ id: `${day(-1)}:생활비카드:c`, date: day(-60) })
		]);

		expect(state).toEqual([]);
	});

	test('투자 계좌 거래는 제외한다', () => {
		const state = load([
			tx({ id: `${day(-1)}:키움증권:d`, date: day(-1), account: 'account:Invst:키움증권' }),
			tx({ id: `${day(-1)}:키움증권_Cash:e`, date: day(-1), account: 'account:Bank:키움증권_Cash' })
		]);

		expect(ids(state)).toEqual([`${day(-1)}:키움증권_Cash:e`]);
	});

	test('오늘과 7일 전 경계를 포함한다', () => {
		const state = load([
			tx({ id: `${day(0)}:생활비카드:today`, date: day(0) }),
			tx({ id: `${day(-7)}:생활비카드:weekAgo`, date: day(-7) }),
			tx({ id: `${day(-8)}:생활비카드:tooOld`, date: day(-8) }),
			tx({ id: `${day(1)}:생활비카드:future`, date: day(1) })
		]);

		expect(ids(state).sort()).toEqual([
			`${day(-7)}:생활비카드:weekAgo`,
			`${day(0)}:생활비카드:today`
		].sort());
	});

	test('payload 가 없으면 상태를 유지한다', () => {
		const prev = [tx({ id: 'keep', date: day(-1) })];
		expect(weeklyTransactions(prev, { type: actions.SET_WEEKLY_TRANSACTIONS, payload: null })).toBe(prev);
	});

	test('전체 적재도 같은 규칙으로 거른다', () => {
		const state = weeklyTransactions([], {
			type: actions.SET_ALL_ACCOUNTS_TRANSACTIONS,
			payload: [
				tx({ id: `${day(-40)}:생활비카드:drifted`, date: day(-2) }),
				tx({ id: `${day(-2)}:생활비카드:old`, date: day(-40) })
			]
		});

		expect(ids(state)).toEqual([`${day(-40)}:생활비카드:drifted`]);
	});

	describe('단건 추가/수정', () => {
		const add = (state, payload) =>
			weeklyTransactions(state, { type: actions.ADD_OR_EDIT_ALL_ACCOUNTS_TRANSACTIONS, payload });

		test('범위 안이면 넣고 날짜순으로 정렬한다', () => {
			const first = add([], tx({ id: `${day(-1)}:생활비카드:b`, date: day(-1) }));
			const state = add(first, tx({ id: `${day(-5)}:생활비카드:a`, date: day(-5) }));

			expect(ids(state)).toEqual([`${day(-5)}:생활비카드:a`, `${day(-1)}:생활비카드:b`]);
		});

		test('범위 밖이면 넣지 않는다', () => {
			expect(add([], tx({ id: `${day(-1)}:생활비카드:x`, date: day(-30) }))).toEqual([]);
		});

		// 날짜를 주 밖으로 옮기면 목록에서 빠져야 한다.
		test('수정으로 범위를 벗어나면 뺀다', () => {
			const state = add(
				[tx({ id: `${day(-1)}:생활비카드:x`, date: day(-1) })],
				tx({ id: `${day(-1)}:생활비카드:x`, date: day(-30) })
			);

			expect(state).toEqual([]);
		});

		test('수정 내용을 병합한다', () => {
			const state = add(
				[tx({ id: `${day(-1)}:생활비카드:x`, date: day(-1) })],
				{ ...tx({ id: `${day(-1)}:생활비카드:x`, date: day(-1) }), amount: -5555 }
			);

			expect(state).toHaveLength(1);
			expect(state[0].amount).toBe(-5555);
		});
	});

	test('삭제는 _id 로 뺀다', () => {
		const state = weeklyTransactions(
			[tx({ id: 'gone', date: day(-1) }), tx({ id: 'stay', date: day(-1) })],
			{ type: actions.DELETE_ALL_ACCOUNTS_TRANSACTIONS, payload: 'gone' }
		);

		expect(ids(state)).toEqual(['stay']);
	});
});
