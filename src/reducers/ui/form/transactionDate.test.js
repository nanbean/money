import bankTransaction from './bankTransaction';
import investmentTransaction from './investmentTransaction';
import * as bankActions from '../../../actions/ui/form/bankTransaction';
import * as investmentActions from '../../../actions/ui/form/investmentTransaction';

// 앱을 며칠 열어 둔 채 새 거래를 입력하면 앱을 연 날이 들어갔다.
// 폼을 열거나 초기화하는 그 순간의 날짜가 들어가야 한다.
describe.each([
	['bankTransaction', bankTransaction, bankActions],
	['investmentTransaction', investmentTransaction, investmentActions]
])('%s 폼 날짜', (_, reducer, actions) => {
	beforeEach(() => {
		jest.useFakeTimers('modern');
	});
	afterEach(() => {
		jest.useRealTimers();
	});

	test('새 거래(날짜 없이 열기)는 여는 순간의 오늘 날짜', () => {
		jest.setSystemTime(new Date(2026, 9, 30, 10, 0, 0));
		const opened = reducer(undefined, { type: '@@INIT' });

		jest.setSystemTime(new Date(2026, 10, 2, 10, 0, 0)); // 이틀 뒤
		const state = reducer(opened, actions.openTransactionInModal());

		expect(state.date).toBe('2026-11-02');
		expect(state.isModalOpen).toBe(true);
	});

	test('닫을 때 초기화해도 그 순간의 오늘 날짜', () => {
		jest.setSystemTime(new Date(2026, 10, 2, 10, 0, 0));
		const state = reducer({ date: '2026-10-30', isModalOpen: true }, actions.resetTransactionForm());
		expect(state.date).toBe('2026-11-02');
		expect(state.isModalOpen).toBe(false);
	});

	test('편집·예정 거래처럼 날짜를 넘기면 그 날짜를 쓴다', () => {
		jest.setSystemTime(new Date(2026, 10, 2, 10, 0, 0));
		const state = reducer(undefined, actions.openTransactionInModal({ isEdit: true, date: '2026-09-15' }));
		expect(state.date).toBe('2026-09-15');
	});

	test('date: undefined 를 넘겨도 오늘 날짜', () => {
		jest.setSystemTime(new Date(2026, 10, 2, 10, 0, 0));
		const state = reducer(undefined, actions.openTransactionInModal({ isEdit: false, date: undefined }));
		expect(state.date).toBe('2026-11-02');
	});
});
