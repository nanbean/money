import { useEffect, useRef } from 'react';

import { RESUME_THRESHOLD_MS, shouldResume } from '../utils/appResume';

// 앱이 한참 뒤에 다시 열렸을 때 onResume 을 부른다. 배경은 appResume.js 참고.
const useAppResume = (onResume, thresholdMs = RESUME_THRESHOLD_MS) => {
	const hiddenAt = useRef(null);
	// 콜백이 매 렌더 새로 오더라도 리스너를 다시 붙이지 않는다.
	const handler = useRef(onResume);
	handler.current = onResume;

	useEffect(() => {
		const onVisibilityChange = () => {
			if (document.visibilityState === 'hidden') {
				hiddenAt.current = Date.now();
				return;
			}

			const since = hiddenAt.current;
			hiddenAt.current = null;
			if (shouldResume(since, Date.now(), thresholdMs)) {
				handler.current();
			}
		};

		// iOS 는 standalone 앱이 페이지 캐시에서 되살아날 때 visibilitychange
		// 없이 pageshow 만 보내는 경우가 있다. 그때는 경과 시간을 알 수 없어
		// 문턱을 따지지 않는다 — 캐시에서 되살아났다는 건 이미 오래 쉬었다는 뜻이다.
		const onPageShow = (event) => {
			if (event.persisted) {
				hiddenAt.current = null;
				handler.current();
			}
		};

		document.addEventListener('visibilitychange', onVisibilityChange);
		window.addEventListener('pageshow', onPageShow);
		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange);
			window.removeEventListener('pageshow', onPageShow);
		};
	}, [thresholdMs]);
};

export default useAppResume;
