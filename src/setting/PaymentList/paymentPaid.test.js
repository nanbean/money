import moment from 'moment';

import { isPaymentPaid, paidWindow, paymentTransactionDraft } from './paymentPaid';
import { NOW, PAID_CASES } from '../../../server/fixtures/paidCases';

const now = () => moment(NOW);

// 서버(services/paymentService.js)의 isPaid 와 같은 표를 돌린다. 두 구현이
// 갈라지면 '납부' 표시와 '미납 N건' 푸시가 어긋난다.
describe('isPaymentPaid — 서버와 공유하는 사례', () => {
	test.each(PAID_CASES.map(c => [c.label, c]))('%s', (_label, c) => {
		expect(isPaymentPaid(c.payment, c.transactions, now())).toBe(c.expected);
	});
});

describe('isPaymentPaid — 방어', () => {
	test('빈 입력', () => {
		expect(isPaymentPaid(null, [], now())).toBe(false);
		expect(isPaymentPaid({ account: 'a' }, undefined, now())).toBe(false);
		expect(isPaymentPaid({ account: 'a' }, [null, undefined], now())).toBe(false);
	});
});

describe('paidWindow', () => {
	test('월간은 이번 달만', () => {
		expect(paidWindow({ interval: 1 }, now())).toEqual({ start: '2026-09', end: '2026-09' });
	});

	test('interval 이 없으면 월간으로 본다', () => {
		// 실측 20건 중 8건에 interval 이 없다.
		expect(paidWindow({}, now())).toEqual({ start: '2026-09', end: '2026-09' });
	});

	test('연간은 열두 달', () => {
		expect(paidWindow({ interval: 12 }, now())).toEqual({ start: '2025-10', end: '2026-09' });
	});
});

describe('paymentTransactionDraft', () => {
	const payment = {
		account: '급여계좌',
		accountId: 'account:Bank:급여계좌',
		payee: '휴대폰요금(KT)',
		category: '통신비',
		subcategory: '',
		amount: -3000,
		day: 11,
		memo: ''
	};

	test('폼이 읽는 모양으로 채운다', () => {
		expect(paymentTransactionDraft(payment, now())).toEqual({
			isEdit: false,
			account: '급여계좌',
			accountId: 'account:Bank:급여계좌',
			date: '2026-09-11',
			payee: '휴대폰요금(KT)',
			category: '통신비',
			amount: -3000,
			memo: ''
		});
	});

	// 폼은 'category:subcategory' 한 덩어리로 다룬다.
	test('subcategory 가 있으면 합쳐서 넣는다', () => {
		expect(paymentTransactionDraft({ ...payment, subcategory: '휴대폰' }, now()).category)
			.toBe('통신비:휴대폰');
	});

	// moment().date(31) 은 2월이면 3월 3일이 된다.
	test('달 길이를 넘는 결제일은 말일로 자른다', () => {
		expect(paymentTransactionDraft({ ...payment, day: 31 }, moment('2026-02-10')).date)
			.toBe('2026-02-28');
		expect(paymentTransactionDraft({ ...payment, day: 31 }, moment('2026-03-10')).date)
			.toBe('2026-03-31');
	});

	test('결제일이 없으면 1일로 본다', () => {
		expect(paymentTransactionDraft({ ...payment, day: undefined }, now()).date)
			.toBe('2026-09-01');
	});

	// 이체 카테고리는 addTransactionAction 이 반대편을 자동으로 만든다.
	test('이체 카테고리를 그대로 넘긴다', () => {
		expect(paymentTransactionDraft({ ...payment, category: '[IRP_Cash]' }, now()).category)
			.toBe('[IRP_Cash]');
	});

	test('빈 입력', () => {
		expect(paymentTransactionDraft(null, now())).toBeNull();
	});
});
