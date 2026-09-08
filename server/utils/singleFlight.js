// Dedupe concurrent invocations of an async function. While a call is in-flight,
// subsequent calls return the same pending promise instead of starting a new run.
// Use to protect tasks that mutate shared external state (Google Sheets singleton,
// CouchDB documents with fixed _id) from racing with themselves.
const singleFlight = (label, fn) => {
	let inFlight = null;
	return (...args) => {
		if (inFlight) {
			console.log(`[singleFlight] ${label} dedup: returning in-flight promise`);
			return inFlight;
		}
		inFlight = Promise.resolve()
			.then(() => fn(...args))
			.finally(() => { inFlight = null; });
		return inFlight;
	};
};

// 인자별로 따로 dedupe 한다.
//
// singleFlight 는 인자를 무시하므로 계좌마다 다른 갱신을 같은 것으로 취급한다
// — 두 번째 계좌를 부른 쪽이 첫 번째 계좌의 promise 를 받고, 자기 계좌는
// 갱신되지 않은 채 성공으로 끝난다.
//
// 같은 키의 동시 호출은 여전히 하나로 묶는다. 같은 계좌 문서를 두 번 겹쳐
// 쓰면 _rev 충돌(409)이 난다 — 알림이 몰려 오면 실제로 겹친다.
const keyedSingleFlight = (label, keyOf, fn) => {
	const inFlight = new Map();
	return (...args) => {
		const key = String(keyOf(...args));
		if (inFlight.has(key)) {
			console.log(`[singleFlight] ${label}(${key}) dedup: returning in-flight promise`);
			return inFlight.get(key);
		}
		const pending = Promise.resolve()
			.then(() => fn(...args))
			.finally(() => { inFlight.delete(key); });
		inFlight.set(key, pending);
		return pending;
	};
};

module.exports = { singleFlight, keyedSingleFlight };
