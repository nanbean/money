// 서버 테스트 설정. react-scripts 가 src/ 를 자기 설정으로 돌리므로 여기는
// server/ 만 본다.
module.exports = {
	testEnvironment: 'node',
	testMatch: ['<rootDir>/server/**/*.test.js'],
	// Jest 27(react-scripts 5 동봉)은 package.json 의 exports 서브패스 맵을
	// 해석하지 못한다. firebase-admin 13 부터 네임스페이스가 서브패스로 갈렸고
	// Node 는 정상 해석하지만(스모크 확인) Jest 는 'Cannot find module
	// firebase-admin/app' 으로 죽는다. 실제 파일로 직접 매핑한다.
	moduleNameMapper: {
		'^firebase-admin/(.*)$': '<rootDir>/node_modules/firebase-admin/lib/$1/index.js'
	}
};
