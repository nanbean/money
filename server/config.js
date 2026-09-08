const key = require('./nanbean-435f267e8481.json');

const config = {
	couchDBUrl: process.env.SERVER_COUCHDB_URL || process.env.REACT_APP_COUCHDB_URL,
	couchDBAdminId: process.env.REACT_APP_COUCHDB_ADMIN_ID,
	couchDBAdminPassword: process.env.REACT_APP_COUCHDB_ADMIN_PW,
	calendarPrimaryEmail: process.env.REACT_APP_CALENDAR_PRIMARY_EMAIL,
	reaitimeApiRul: process.env.REACT_APP_REALTIME_API_URL,
	googleSpreadsheetDocId: process.env.REACT_APP_GOOGLE_SPREADSHEET_DOC_ID,
	apiKey: process.env.REACT_APP_API_KEY,
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
