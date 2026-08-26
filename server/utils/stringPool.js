// 인메모리 거래 캐시(server/db/pouchdb.js)의 문자열 중복을 없앤다.
//
// 28,000건 문서에서 accountId 는 고유값이 49개, category 76개, subcategory 39개뿐인데
// JSON.parse 는 문서마다 별개 문자열 객체를 만든다. 같은 값을 하나로 모으면
// 실측 기준 캐시 보유량이 12.6MB -> 8.6MB 로 줄었다.
//
// 두 가지를 지켜야 한다.
//
// 1. 객체를 새로 만들지 말고 제자리에서 값만 바꾼다. 필드를 줄이려고 delete 를 쓰면
//    객체가 dictionary mode 로 떨어져 오히려 12.6MB -> 22.3MB 로 늘었다. 고정 형태로
//    다시 만드는 방법은 7.7MB 까지 줄지만 문서 필드가 33종이라 목록을 유지하기 어렵고
//    새 필드가 조용히 사라질 위험이 있다.
//
// 2. _id 와 _rev 는 건드리지 않는다. 문서마다 고유해서 모아도 이득이 없고, _rev 는
//    문서를 고칠 때마다 값이 바뀌어 풀만 계속 커진다(실측 풀 크기 10,835 -> 38,643).
const SKIP_KEYS = new Set(['_id', '_rev']);

const createStringPool = () => {
	const pool = new Map();

	// 문서의 문자열 값을 공유 인스턴스로 치환한다. 같은 문서 객체를 그대로 돌려준다.
	const intern = (doc) => {
		if (!doc || typeof doc !== 'object') return doc;
		for (const key in doc) {
			if (SKIP_KEYS.has(key)) continue;
			const value = doc[key];
			if (typeof value !== 'string') continue;
			const shared = pool.get(value);
			if (shared === undefined) {
				pool.set(value, value);
			} else {
				doc[key] = shared;
			}
		}
		return doc;
	};

	return { intern, size: () => pool.size };
};

module.exports = { createStringPool, SKIP_KEYS };
