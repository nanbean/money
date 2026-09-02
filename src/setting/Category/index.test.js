import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { Provider } from 'react-redux';

import configureStore from '../../store';
import Category from './index';

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

// 이름 변경·삭제 확인 대화상자가 실제로 뜨는지 본다.
//
// 순수 함수 테스트로는 "언제 떠야 하는가" 만 알 수 있고 "정말 렌더되는가" 는
// 알 수 없다. testing-library 를 새로 넣지 않고 jsdom + react-dom 으로 붙인다.

const TX = (over) => ({
	_id: `2026-01-01:급여계좌:${Math.random()}`,
	date: '2026-01-01',
	accountId: 'account:Bank:급여계좌',
	amount: -1000,
	...over
});

const initialState = {
	settings: {
		categoryList: ['식비:군것질', '식비:외식', '분류없음', '통신비'],
		livingExpenseExempt: [],
		categoryIcons: {},
		categoryColors: {},
		paymentList: [{ payee: '휴대폰요금', category: '통신비', amount: -3000, valid: true }],
		currency: 'KRW',
		exchangeRate: 1378.85
	},
	// '식비:군것질' 2건, '통신비' 1건. '분류없음' 은 0건.
	allAccountsTransactions: [
		TX({ category: '식비', subcategory: '군것질' }),
		TX({ category: '식비', subcategory: '군것질' }),
		TX({ category: '통신비' })
	]
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
		// thunk 는 실제 DB 를 건드리므로 삼킨다. 이 테스트는 렌더만 본다.
		return typeof action === 'function' ? undefined : realDispatch(action);
	};

	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	// react-dom/test-utils 의 act 다 — createRoot 렌더에는 필요하다.
	// testing-library 를 쓰지 않으므로 해당 규칙은 오탐이다.
	// eslint-disable-next-line testing-library/no-unnecessary-act
	act(() => {
		root.render(<Provider store={store}><Category /></Provider>);
	});
};

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

const text = () => document.body.textContent;

// 버튼 라벨로 찾는다. MUI Dialog 는 portal 로 body 에 붙는다.
const findButton = (label) => Array.from(document.body.querySelectorAll('button'))
	.find(b => b.textContent.trim() === label);

const click = (el) => act(() => {
	el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
});

// 편집 대화상자를 연다. 이름이 적힌 잎 노드를 찾아 위로 올라가며 Edit 을 찾는다.
const openEditFor = (name) => {
	const leaf = Array.from(container.querySelectorAll('*'))
		.find(el => el.children.length === 0 && el.textContent.trim() === name);
	expect(leaf).toBeTruthy();

	let node = leaf;
	let button;
	while (node && !button) {
		node = node.parentElement;
		if (!node || node === container) break;
		button = Array.from(node.querySelectorAll('button'))
			.find(b => b.textContent.trim() === 'Edit');
	}
	expect(button).toBeTruthy();
	click(button);
};

const typeName = (value) => {
	const input = Array.from(document.body.querySelectorAll('input'))
		.find(i => i.type === 'text');
	expect(input).toBeTruthy();
	act(() => {
		const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
		setter.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
};

describe('Category 확인 대화상자', () => {
	beforeEach(mount);

	test('목록이 부모 그룹으로 렌더된다', () => {
		expect(text()).toContain('식비');
		expect(text()).toContain('군것질');
		expect(text()).toContain('통신비');
	});

	// 이게 사용자가 물은 것이다 — 이름을 바꾸면 대화상자가 뜨는가.
	test('참조가 있는 카테고리 이름을 바꾸면 대화상자가 뜬다', () => {
		openEditFor('군것질');
		typeName('식비:간식');
		click(findButton('Save'));

		expect(text()).toContain('Rename category');
		expect(text()).toContain('식비:군것질 → 식비:간식');
		expect(text()).toContain('거래');
		// 거래 2건
		expect(text()).toMatch(/거래\s*2\s*건/);
		expect(findButton('이름 바꾸기')).toBeTruthy();
		// 반쪽 이름 변경은 선택지로 두지 않는다 — 그 결과가 곧 고아 카테고리다.
		expect(findButton('목록만 바꾸기')).toBeFalsy();
	});

	test('정기지불 참조도 함께 보여준다', () => {
		openEditFor('통신비');
		typeName('통신');
		click(findButton('Save'));

		expect(text()).toContain('Rename category');
		expect(text()).toMatch(/거래\s*1\s*건/);
		expect(text()).toMatch(/정기지불\s*1\s*건/);
	});

	// 참조가 없으면 붙잡지 않는다.
	test('참조가 없는 카테고리는 대화상자 없이 바로 처리한다', () => {
		openEditFor('분류없음');
		typeName('미분류');
		click(findButton('Save'));

		expect(text()).not.toContain('Rename category');
	});

	test('삭제도 참조가 있으면 대화상자가 뜬다', () => {
		openEditFor('군것질');
		click(findButton('Delete'));

		expect(text()).toContain('Delete category');
		expect(text()).toMatch(/거래\s*2\s*건/);
		expect(findButton('삭제')).toBeTruthy();
		// 삭제 대화상자에 이름 변경 버튼이 있으면 안 된다
		expect(findButton('이름 바꾸기')).toBeFalsy();
	});

	// 확인 대화상자의 닫기 라벨은 편집 대화상자의 Cancel 과 달라야 한다.
	// 확인이 떠도 편집 대화상자는 뒤에 남으므로 같은 라벨이면 DOM 에 둘 겹친다.
	test('돌아가기는 아무 것도 실행하지 않는다', () => {
		openEditFor('군것질');
		typeName('식비:간식');
		click(findButton('Save'));
		const before = dispatched.length;

		click(findButton('돌아가기'));

		expect(text()).not.toContain('Rename category');
		expect(dispatched.length).toBe(before);
	});

	test('확인 대화상자에는 편집 대화상자와 겹치는 라벨이 없다', () => {
		openEditFor('군것질');
		typeName('식비:간식');
		click(findButton('Save'));

		const labels = Array.from(document.body.querySelectorAll('button')).map(b => b.textContent.trim());
		expect(labels.filter(l => l === '돌아가기')).toHaveLength(1);
	});
});
