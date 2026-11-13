const key = require('./nanbean-435f267e8481.json');

// 서버 전용 값은 REACT_APP_ 접두어를 쓰지 않는다.
//
// Create React App 은 REACT_APP_* 를 '브라우저에 공개해도 되는 값' 으로 보고, Firebase
// SDK 가 process.env.__FIREBASE_DEFAULTS__ 를 읽는 탓에 그 전체가 객체째 main.js 에
// 들어갔다 — CouchDB 관리자 비밀번호와 알림 API 키가 공개 번들에 있었다 (2026-11-14).
// 같은 .env 파일을 서버와 빌드가 함께 읽으므로 이름으로 가른다.
//
// 옛 이름은 원격 .env 를 바꾸는 동안만 함께 읽는다. 다 바꾼 뒤 지운다.
const env = (name) => process.env[name] || process.env[`REACT_APP_${name}`];

const config = {
	couchDBUrl: process.env.SERVER_COUCHDB_URL || process.env.REACT_APP_COUCHDB_URL,
	couchDBAdminId: env('COUCHDB_ADMIN_ID'),
	couchDBAdminPassword: env('COUCHDB_ADMIN_PW'),
	calendarPrimaryEmail: env('CALENDAR_PRIMARY_EMAIL'),
	reaitimeApiRul: env('REALTIME_API_URL'),
	googleSpreadsheetDocId: env('GOOGLE_SPREADSHEET_DOC_ID'),
	apiKey: process.env.NOTIFY_API_KEY || process.env.REACT_APP_API_KEY,
	// Gemini 모델 이름.
	//
	// 2026-09-08: 새 API 키로 바꾸자 gemini-2.5-flash 가 404 를 냈다 —
	// 'no longer available to new users'. 키는 정상이었고 모델이 문제였다.
	// findCategoryFromGemini 가 에러를 삼키고 '분류없음' 을 쓰는 탓에 화면에는
	// 분류 실패로만 보였다.
	//
	// 이름이 코드 세 곳에 흩어져 있어 한 곳만 고치면 나머지가 조용히 깨진다.
	// env 로 덮을 수 있게 둔 건, 다음에 또 바뀔 때 배포 없이 넘기기 위해서다.
	geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
	key
};

module.exports = config;
