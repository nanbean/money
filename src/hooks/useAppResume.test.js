import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import useAppResume from './useAppResume';

// 순수 함수 테스트로는 "언제 다시 받아야 하는가" 만 알 수 있고, 이벤트가
// 실제로 붙는지는 알 수 없다. iOS 복귀는 여기서만 검증된다.

// createRoot + act 조합에 필요하다. 없으면 unmount 때마다 경고가 뜬다.
global.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
let mounted = false;

const Probe = ({ onResume, thresholdMs }) => {
	useAppResume(onResume, thresholdMs);
	return null;
};

const mount = (props) => {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	// eslint-disable-next-line testing-library/no-unnecessary-act
	act(() => {
		root.render(<Probe {...props} />);
	});
	mounted = true;
};

const unmount = () => {
	if (!mounted) return;
	// eslint-disable-next-line testing-library/no-unnecessary-act
	act(() => root.unmount());
	container.remove();
	mounted = false;
};

// visibilityState 는 읽기 전용이라 덮어써야 한다.
const setVisibility = (state) => {
	Object.defineProperty(document, 'visibilityState', {
		configurable: true,
		get: () => state
	});
	act(() => {
		document.dispatchEvent(new Event('visibilitychange'));
	});
};

afterEach(() => {
	unmount();
	jest.useRealTimers();
});

describe('useAppResume', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2026-09-04T10:00:00Z'));
	});

	it('한참 숨었다 돌아오면 부른다', () => {
		// Arrange
		const onResume = jest.fn();
		mount({ onResume });

		// Act
		setVisibility('hidden');
		jest.setSystemTime(new Date('2026-09-04T11:00:00Z'));
		setVisibility('visible');

		// Assert
		expect(onResume).toHaveBeenCalledTimes(1);
	});

	it('짧게 숨었다 돌아오면 부르지 않는다', () => {
		// Arrange
		const onResume = jest.fn();
		mount({ onResume });

		// Act
		setVisibility('hidden');
		jest.setSystemTime(new Date('2026-09-04T10:00:05Z'));
		setVisibility('visible');

		// Assert
		expect(onResume).not.toHaveBeenCalled();
	});

	// 첫 렌더에서 visible 이벤트가 와도 초기 로딩과 겹치면 안 된다.
	it('숨은 적 없이 visible 이면 부르지 않는다', () => {
		// Arrange
		const onResume = jest.fn();
		mount({ onResume });

		// Act
		setVisibility('visible');

		// Assert
		expect(onResume).not.toHaveBeenCalled();
	});

	// 두 번 복귀하면 두 번 받아야 한다. 상태가 남아 한 번만 되면 안 된다.
	it('복귀할 때마다 부른다', () => {
		// Arrange
		const onResume = jest.fn();
		mount({ onResume });

		// Act
		setVisibility('hidden');
		jest.setSystemTime(new Date('2026-09-04T11:00:00Z'));
		setVisibility('visible');

		setVisibility('hidden');
		jest.setSystemTime(new Date('2026-09-04T12:00:00Z'));
		setVisibility('visible');

		// Assert
		expect(onResume).toHaveBeenCalledTimes(2);
	});

	// 한 번 부른 뒤 hidden 없이 visible 이 또 오면 중복 호출되면 안 된다.
	it('hidden 없이 visible 이 반복되면 한 번만 부른다', () => {
		// Arrange
		const onResume = jest.fn();
		mount({ onResume });

		// Act
		setVisibility('hidden');
		jest.setSystemTime(new Date('2026-09-04T11:00:00Z'));
		setVisibility('visible');
		setVisibility('visible');

		// Assert
		expect(onResume).toHaveBeenCalledTimes(1);
	});

	// iOS standalone 은 페이지 캐시 복귀 시 pageshow 만 보내는 경우가 있다.
	it('persisted pageshow 면 부른다', () => {
		// Arrange
		const onResume = jest.fn();
		mount({ onResume });

		// Act
		act(() => {
			const event = new Event('pageshow');
			Object.defineProperty(event, 'persisted', { get: () => true });
			window.dispatchEvent(event);
		});

		// Assert
		expect(onResume).toHaveBeenCalledTimes(1);
	});

	// 첫 로드의 pageshow 는 persisted 가 false 다.
	it('첫 로드 pageshow 는 부르지 않는다', () => {
		// Arrange
		const onResume = jest.fn();
		mount({ onResume });

		// Act
		act(() => {
			window.dispatchEvent(new Event('pageshow'));
		});

		// Assert
		expect(onResume).not.toHaveBeenCalled();
	});

	it('문턱을 넘길 수 있다', () => {
		// Arrange
		const onResume = jest.fn();
		mount({ onResume, thresholdMs: 1000 });

		// Act
		setVisibility('hidden');
		jest.setSystemTime(new Date('2026-09-04T10:00:05Z'));
		setVisibility('visible');

		// Assert
		expect(onResume).toHaveBeenCalledTimes(1);
	});

	it('언마운트하면 리스너를 뗀다', () => {
		// Arrange
		const onResume = jest.fn();
		mount({ onResume });
		setVisibility('hidden');

		// Act
		unmount();
		jest.setSystemTime(new Date('2026-09-04T11:00:00Z'));
		Object.defineProperty(document, 'visibilityState', {
			configurable: true,
			get: () => 'visible'
		});
		document.dispatchEvent(new Event('visibilitychange'));

		// Assert
		expect(onResume).not.toHaveBeenCalled();
	});
});
