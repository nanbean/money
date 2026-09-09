import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { Provider } from 'react-redux';

import configureStore from '../store';
import Spending from './Spending';

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

// ResponsiveContainer 는 jsdom 에서 폭이 0 이라 차트를 그리지 않는다. 여기서
// 보는 것은 패널이 펼쳐졌는지이므로 차트 자체는 필요 없다.
//
// jsdom 에는 ResizeObserver 가 없다. SpendingHeatmap 이 폭을 재는 데 쓰므로
// 아무것도 안 하는 스텁을 둔다.
global.ResizeObserver = class {
	observe () {}
	unobserve () {}
	disconnect () {}
};

global.IS_REACT_ACT_ENVIRONMENT = true;

const ACCOUNT = {
	_id: 'account:CCard:생활비카드',
	name: '생활비카드',
	type: 'CCard',
	currency: 'KRW'
};

// 연간 예측 패널은 annualChangeRate !== null 일 때만 렌더된다 — 작년 지출이
// 있어야 한다.
const tx = (date, amount, id) => ({
	_id: id,
	date,
	accountId: ACCOUNT._id,
	amount,
	payee: '가게',
	category: '식비',
	subcategory: '외식'
});

const year = new Date().getFullYear();

const initialState = {
	settings: {
		currency: 'KRW',
		exchangeRate: 1378.85,
		livingExpenseExempt: [],
		categoryList: ['식비:외식'],
		categoryIcons: {},
		categoryColors: {}
	},
	accountList: [ACCOUNT],
	allAccountsTransactions: [
		tx(`${year}-01-15`, -50000, 'a'),
		tx(`${year}-02-15`, -60000, 'b'),
		tx(`${year - 1}-01-15`, -40000, 'c'),
		tx(`${year - 1}-06-15`, -70000, 'd')
	],
	dropPayeeList: []
};

let container;
let root;

const mount = () => {
	const store = configureStore(initialState);
	const realDispatch = store.dispatch;
	store.dispatch = (action) =>
		(typeof action === 'function' ? undefined : realDispatch(action));

	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	// eslint-disable-next-line testing-library/no-unnecessary-act
	act(() => {
		root.render(<Provider store={store}><Spending /></Provider>);
	});
};

afterEach(() => {
	// eslint-disable-next-line testing-library/no-unnecessary-act
	act(() => root.unmount());
	container.remove();
});

const click = (el) => act(() => {
	el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
});

// jsdom 은 transitionend 를 내보내지 않아 MUI Collapse 가 entering/exiting 에
// 멈춘다. 그 상태의 DOM 은 펼침과 접힘이 구분되지 않는다 (둘 다 hidden 클래스
// 없이 height: 0px). react-transition-group 의 타임아웃을 태워 상태를 끝낸다.
const settle = () => act(() => {
	jest.advanceTimersByTime(500);
});

// 범위 버튼과 패널 헤더 모두 텍스트가 곧 라벨이다. 잎 노드를 눌러도
// onClick 이 걸린 상위 Box 로 버블링된다.
const byLabel = (label) => {
	const found = Array.from(container.querySelectorAll('*'))
		.find(el => el.children.length === 0 && el.textContent.trim() === label);
	expect(found).toBeTruthy();
	return found;
};

// MUI Collapse 는 접혀 있을 때 height 0 컨테이너를 남긴다. 클래스로 본다.
const projectionCollapse = () => {
	const found = Array.from(container.querySelectorAll('.MuiCollapse-root'))
		.find(el => el.textContent.includes('Projected'));
	expect(found).toBeTruthy();
	return found;
};

// 전이가 끝난 뒤에는 펼침이면 entered, 접힘이면 hidden 이 붙는다.
const isExpanded = () => {
	const el = projectionCollapse();
	expect(
		el.classList.contains('MuiCollapse-entered') || el.classList.contains('MuiCollapse-hidden')
	).toBe(true);
	return el.classList.contains('MuiCollapse-entered');
};

describe('Spending 연간 예측 패널', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mount();
		settle();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	// 기본 범위는 1M 이다.
	it('처음에는 접혀 있다', () => {
		expect(isExpanded()).toBe(false);
	});

	// 이게 요청의 핵심이다. YTD 는 '올해가 어떻게 끝날까' 를 보려는 선택인데
	// 창은 오늘까지라, 남은 달은 이 패널의 점선에만 있다.
	it('YTD 를 고르면 펼쳐진다', () => {
		click(byLabel('YTD'));
		settle();

		expect(isExpanded()).toBe(true);
	});

	// 나갈 때 접지 않는다 — 직접 펼쳐 둔 것을 range 변경으로 닫으면 뜬금없다.
	it('YTD 에서 나가도 접지 않는다', () => {
		click(byLabel('YTD'));
		settle();
		click(byLabel('3M'));
		settle();

		expect(isExpanded()).toBe(true);
	});

	// 매 렌더마다 펼치면 사용자가 접을 수 없다. range 가 바뀔 때만 손대야 한다.
	it('YTD 에서 직접 접으면 다시 열리지 않는다', () => {
		click(byLabel('YTD'));
		settle();
		expect(isExpanded()).toBe(true);

		// 헤더를 누르면 토글된다. 'Annual cumulative' 는 같은 Typography 안에
		// span 이 있어 잎이 아니므로 그 span 을 누른다 — onClick 이 걸린
		// 상위 Box 로 버블링된다.
		click(byLabel('· 누적 추이'));
		settle();

		expect(isExpanded()).toBe(false);
	});
});
