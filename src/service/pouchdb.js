import { COUCHDB_URL } from '../constants';

// CouchDB 의 _session 엔드포인트를 직접 부른다.
//
// 예전에는 pouchdb-authentication 플러그인이 이걸 감싸고 있었다. 그 패키지가
// request → hawk/boom/cryptiles/hoek/sntp, form-data, url-parse 계열을 끌고
// 와서 critical 4건을 포함한 취약점 10건의 출처였고, 마지막 릴리스가 오래돼
// 고쳐질 일이 없다 (npm audit 이 제시하는 'fix' 는 0.5.5 로의 다운그레이드다).
//
// 쓰고 있던 API 는 login·logout·getSession 셋뿐이고, 각각 _session 의
// POST·DELETE·GET 이다. 응답 모양도 CouchDB 것을 그대로 소비하고 있었다 —
// authActions 가 login 의 .name 과 getSession 의 .userCtx.name 을 읽는다.
//
// 실측(2026-09-09):
//   GET  → {"ok":true,"userCtx":{"name":null,"roles":[]},"info":{...}}
//   POST → {"ok":true,"name":"admin","roles":["_admin"]} + Set-Cookie AuthSession
const SESSION_URL = `https://${COUCHDB_URL}/_session`;

// AuthSession 쿠키를 주고받아야 한다. 서버의 requireAuth 도 같은 쿠키를 본다.
const session = async (init) => {
	const response = await fetch(SESSION_URL, { credentials: 'include', ...init });
	return await response.json();
};

export const login = async (username, password) => session({
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ name: username, password })
});

export const logout = async () => session({ method: 'DELETE' });

// 호출부가 userCtx.name 을 바로 읽는다. 네트워크가 끊겼을 때 undefined 가
// 올라가면 그 자리에서 죽으므로 모양을 보장한다.
export const checkAuthState = async () => {
	try {
		const data = await session({ method: 'GET' });
		return (data && data.userCtx) ? data : { userCtx: { name: null } };
	} catch (err) {
		return { userCtx: { name: null } };
	}
};
