import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { Provider } from 'react-redux';

import configureStore from '../../store';
import PaymentList from './index';

// couchdbActions 가 모듈 로드 시 PouchDB 를 연다. 이 테스트는 렌더만 보므로
// 최소 스텁으로 막는다 — 안 막으면 teardown 뒤에 leveldb 가 import 를 시도한다.
jest.mock('pouchdb', () => {
	function MockPouch () {
		return {
			allDocs: () => Promise.resolve({ rows: [] }),
			get: () => Promise.reject(Object.assign(new Error('missing'), { name: 'not_found' })),
			put: () => Promise.resolve({}),
			bulkDocs: () => Promise.resolve([]),
			sync: () => ({ on: () => ({ on: () => ({}) }), cancel: () => {} }),
			replicate: { from: () => ({ on: () => ({ on: () => ({}) }) }) },
			destroy: () => Promise.resolve()
		};
	}
	MockPouch.plugin = () => MockPouch;
	return MockPouch;
});

// 납부 여부는 '이번 달' 을 기준으로 한다. 고정 날짜를 쓰면 달이 바뀔 때
// 테스트가 깨지므로 지금 달로 만든다.
const thisMonth = (day) => {
	const now = new Date();
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	return `${now.getFullYear()}-${mm}-${String(day).padStart(2, '0')}`;
};

global.IS_REACT_ACT_ENVIRONMENT = true;

const PAID = {
	account: '급여계좌',
	accountId: 'account:Bank:급여계좌',
	payee: '카이스트회비',
	category: '회비',
	amount: -10000,
	day: 1,
	valid: true
};
const UNPAID = {
	account: '급여계좌',
	accountId: 'account:Bank:급여계좌',
	payee: '휴대폰요금(KT)',
	category: '통신비',
	amount: -3000,
	day: 11,
	valid: true
};

const initialState = {
	settings: {
		paymentList: [UNPAID, PAID],
		categoryList: ['통신비', '회비'],
		categoryIcons: {},
		categoryColors: {},
		currency: 'KRW',
		exchangeRate: 1378.85
	},
	accountList: [
		{ _id: 'account:Bank:급여계좌', name: '급여계좌', type: 'Bank', currency: 'KRW' }
	],
	// 회비만 이번 달에 나갔다.
	allAccountsTransactions: [{
		_id: 'tx1',
		accountId: 'account:Bank:급여계좌',
		payee: '카이스트회비',
		category: '회비',
		date: thisMonth(1),
		amount: -10000
	}],
	dropPayeeList: []
};

let container;
let root;
let dispatched;

const mount = () => {
	const store = configureStore(initialState);
	dispatched = [];
	const realDispatch = store.dispatch;
	store.dispatch = (action) => {
		dispatched.push(action);
		// thunk 는 실제 DB 를 건드리므로 삼킨다.
		return typeof action === 'function' ? undefined : realDispatch(action);
	};

	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	// eslint-disable-next-line testing-library/no-unnecessary-act
	act(() => {
		root.render(<Provider store={store}><PaymentList /></Provider>);
	});
};

afterEach(() => {
	// eslint-disable-next-line testing-library/no-unnecessary-act
	act(() => root.unmount());
	container.remove();
});

const text = () => document.body.textContent;

// 히어로의 '다음 결제 3건' 이 같은 상호를 렌더한다. 목록만 봐야 한다.
// 'All payments' 와 두 상호를 모두 담은 가장 작은 div 가 목록 영역이다.
const listSection = () => {
	const found = Array.from(container.querySelectorAll('div'))
		.filter(el => el.textContent.includes('All payments')
			&& el.textContent.includes('휴대폰요금(KT)')
			&& el.textContent.includes('카이스트회비'))
		.sort((a, b) => a.textContent.length - b.textContent.length)[0];
	expect(found).toBeTruthy();
	return found;
};

const recordButtons = () =>
	Array.from(listSection().querySelectorAll('button[title="거래 등록"]'));

const click = (el) => act(() => {
	el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
});

describe('PaymentList 거래 등록', () => {
	beforeEach(mount);

	it('납부한 항목에 배지가 뜬다', () => {
		expect(text()).toContain('납부');
	});

	// 이게 기능의 핵심이다 — 버튼이 실제로 렌더되는가.
	// 행이 둘이고 하나만 미납이므로 버튼도 하나여야 한다.
	it('미납 항목에만 등록 버튼이 있다', () => {
		expect(recordButtons()).toHaveLength(1);
	});

	it('등록을 누르면 폼이 채워진 채 열린다', () => {
		click(recordButtons()[0]);

		const open = dispatched.find(a => a && a.type === 'OPEN_TRANSACTION_IN_MODAL');
		expect(open).toBeTruthy();
		expect(open.payload).toMatchObject({
			isEdit: false,
			account: '급여계좌',
			accountId: 'account:Bank:급여계좌',
			date: thisMonth(11),
			payee: '휴대폰요금(KT)',
			category: '통신비',
			amount: -3000
		});
	});

	it('등록만으로 거래를 저장하지 않는다', () => {
		click(recordButtons()[0]);

		// 금액이 추정치라 사람이 확인해야 한다. 폼을 열기만 한다.
		expect(dispatched.some(a => typeof a === 'function')).toBe(false);
	});

	// 정렬 비교 함수는 따로 테스트하지만, 컴포넌트가 그걸 쓰는지는 여기서만
	// 확인된다. 히어로는 다음 결제일 순이라 목록 영역만 본다.
	it('결제일 순으로 렌더된다', () => {
		const body = listSection().textContent;

		expect(body.indexOf('카이스트회비')).toBeLessThan(body.indexOf('휴대폰요금(KT)'));
	});
});
