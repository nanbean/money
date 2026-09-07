import { RESUME_THRESHOLD_MS, shouldResume } from './appResume';

describe('shouldResume', () => {
	const now = 1_700_000_000_000;

	test('문턱을 넘으면 다시 받는다', () => {
		expect(shouldResume(now - RESUME_THRESHOLD_MS - 1, now)).toBe(true);
		expect(shouldResume(now - 10 * 60 * 1000, now)).toBe(true);
	});

	// 경계는 포함이다.
	test('정확히 문턱이면 다시 받는다', () => {
		expect(shouldResume(now - RESUME_THRESHOLD_MS, now)).toBe(true);
	});

	// 짧은 앱 전환마다 전체 복제를 걸면 눈에 띄게 느려진다.
	test('짧게 숨었다 돌아오면 그냥 둔다', () => {
		expect(shouldResume(now - 1000, now)).toBe(false);
		expect(shouldResume(now, now)).toBe(false);
	});

	// 첫 렌더에서 visible 이벤트가 오는 경우가 있다. 숨은 적이 없으면
	// 초기 로딩과 겹치므로 아무것도 하지 않는다.
	test('숨은 적이 없으면 그냥 둔다', () => {
		expect(shouldResume(null, now)).toBe(false);
		expect(shouldResume(undefined, now)).toBe(false);
	});

	// 기기 시계가 뒤로 갈 수 있다 (수동 변경, 시간대 보정).
	test('시계가 뒤로 가면 그냥 둔다', () => {
		expect(shouldResume(now, now - 60 * 60 * 1000)).toBe(false);
	});

	test('문턱을 바꿀 수 있다', () => {
		expect(shouldResume(now - 5000, now, 1000)).toBe(true);
		expect(shouldResume(now - 5000, now, 10_000)).toBe(false);
	});

	test('now 가 없으면 그냥 둔다', () => {
		expect(shouldResume(now - 10 * 60 * 1000, null)).toBe(false);
	});
});
