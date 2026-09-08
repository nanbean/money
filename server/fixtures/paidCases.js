// 납부 판정 사례 표.
//
// 이 표는 클라이언트(src/setting/PaymentList/paymentPaid.js)와 서버
// (services/paymentService.js) 양쪽 테스트가 같이 쓴다. 두 구현이 갈라지면
// 여기서 잡힌다 — ESM/CJS 경계 때문에
// 규칙 자체는 공유할 수 없어서, 최소한 기대값은 한 곳에 둔다.
//
// now 를 'YYYY-MM-DD' 로 주고, 각 테스트가 자기 방식으로 시간을 고정한다.
const NOW = '2026-09-07';

const tx = (over) => ({
	accountId: 'account:Bank:급여계좌',
	payee: '휴대폰요금(KT)',
	category: '통신비',
	date: '2026-09-11',
	amount: -3000,
	...over
});

const payment = (over) => ({
	account: '급여계좌',
	payee: '휴대폰요금(KT)',
	category: '통신비',
	day: 11,
	amount: -3000,
	valid: true,
	...over
});

const PAID_CASES = [
	{
		label: '이번 달에 같은 계좌·상호·카테고리 거래가 있으면 납부',
		payment: payment(),
		transactions: [tx()],
		expected: true
	},
	{
		label: '거래가 없으면 미납',
		payment: payment(),
		transactions: [],
		expected: false
	},
	{
		label: '지난 달 거래는 월간 주기에서 미납',
		payment: payment({ interval: 1 }),
		transactions: [tx({ date: '2026-08-11' })],
		expected: false
	},
	{
		label: '분기 주기는 두 달 전 거래도 납부',
		payment: payment({ interval: 3 }),
		transactions: [tx({ date: '2026-07-11' })],
		expected: true
	},
	{
		label: '분기 주기라도 세 달 전은 미납',
		payment: payment({ interval: 3 }),
		transactions: [tx({ date: '2026-06-11' })],
		expected: false
	},
	{
		label: '다음 달 거래는 창 밖이라 미납',
		payment: payment(),
		transactions: [tx({ date: '2026-10-11' })],
		expected: false
	},
	{
		label: '계좌가 다르면 미납',
		payment: payment(),
		transactions: [tx({ accountId: 'account:Bank:BoA' })],
		expected: false
	},
	{
		label: '상호가 다르면 미납',
		payment: payment(),
		transactions: [tx({ payee: '휴대폰요금(SKT)' })],
		expected: false
	},
	{
		label: '카테고리가 다르면 미납',
		payment: payment(),
		transactions: [tx({ category: '공과금' })],
		expected: false
	},
	{
		label: '정기지불에 subcategory 가 있으면 거래도 같아야 납부',
		payment: payment({ subcategory: '휴대폰' }),
		transactions: [tx({ subcategory: '인터넷' })],
		expected: false
	},
	{
		label: 'subcategory 가 같으면 납부',
		payment: payment({ subcategory: '휴대폰' }),
		transactions: [tx({ subcategory: '휴대폰' })],
		expected: true
	},
	{
		// 실측 20건 중 6건이 subcategory 가 빈 문자열이다.
		label: '정기지불의 subcategory 가 비면 거래 값은 안 따진다',
		payment: payment({ subcategory: '' }),
		transactions: [tx({ subcategory: '아무거나' })],
		expected: true
	},
	{
		label: 'accountId 가 없는 거래는 무시한다',
		payment: payment(),
		transactions: [tx({ accountId: undefined })],
		expected: false
	},
	{
		// IRP·연금저축은 이체 카테고리다. 규칙이 이체를 따로 취급하지 않는다.
		label: '이체 카테고리도 같은 규칙으로 판정한다',
		payment: payment({ payee: '투자(IRP)', category: '[IRP_Cash]', subcategory: '' }),
		transactions: [tx({ payee: '투자(IRP)', category: '[IRP_Cash]', date: '2026-09-25' })],
		expected: true
	},
	{
		label: '거래가 여럿이면 하나만 맞아도 납부',
		payment: payment(),
		transactions: [tx({ payee: '다른곳' }), tx(), tx({ category: '공과금' })],
		expected: true
	}
];

module.exports = { NOW, PAID_CASES };
