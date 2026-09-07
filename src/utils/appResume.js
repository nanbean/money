// iOS 홈 화면 PWA 는 새로 고침 수단이 없다. 주소창도 pull-to-refresh 도 없어
// 사용자가 데이터를 다시 받을 방법이 아예 없다.
//
// 백그라운드로 들어가면 iOS 가 JS 실행을 정지시키고, live sync 의 longpoll
// 연결이 끊긴다. PouchDB 의 retry 가 되살리기도 하지만 백오프가 길어질 수
// 있고, 애초에 live sync 가 없는 데이터도 있다 (histories·reports 는 일회성
// 복제다). 그래서 복귀를 감지해 직접 다시 붙인다.

// 짧은 앱 전환마다 다시 복제하면 눈에 띄게 느려진다. 숨어 있던 시간으로 가른다.
export const RESUME_THRESHOLD_MS = 60 * 1000;

// 숨어 있던 시간이 문턱을 넘었으면 다시 받아야 한다.
//
// hiddenAt 이 null 인 경우는 숨은 적이 없다는 뜻이다 — 첫 렌더에서 visible
// 이벤트가 오는 경우가 있어 그때 복제를 걸면 초기 로딩과 겹친다.
export const shouldResume = (hiddenAt, now, thresholdMs = RESUME_THRESHOLD_MS) => {
	if (typeof hiddenAt !== 'number') return false;
	if (typeof now !== 'number') return false;
	// 기기 시계가 뒤로 간 경우 (수동 변경, 시간대 보정). 음수 경과는 버린다.
	if (now < hiddenAt) return false;
	return now - hiddenAt >= thresholdMs;
};
