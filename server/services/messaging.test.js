const fs = require('fs').promises;
const { getMessaging } = require('firebase-admin/messaging');
const { addToken, removeToken, sendNotification } = require('./messaging');

// Mock dependencies
jest.mock('fs', () => ({
	promises: {
		readFile: jest.fn(),
		writeFile: jest.fn()
	}
}));

// 모킹도 실제 서브패스를 따라가야 한다. 예전 모킹은 firebase-admin 14 에서
// 사라진 admin.messaging() 을 흉내내고 있었고, 그래서 실제 코드가 깨져도
// 이 테스트는 통과했다.
const mockSend = jest.fn();
//
// virtual: 이 jest 버전의 모듈 해석기는 package.json 의 exports(서브패스)를 읽지
// 못해 'Cannot find module firebase-admin/app' 으로 테스트 파일 자체가 실행되지
// 않았다. 어차피 전부 모킹하므로 실제 파일을 찾지 않게 한다.
jest.mock('firebase-admin/app', () => ({
	initializeApp: jest.fn(),
	cert: jest.fn()
}), { virtual: true });
jest.mock('firebase-admin/messaging', () => ({
	getMessaging: jest.fn(() => ({ send: mockSend }))
}), { virtual: true });

// Mock the credential file
jest.mock('./firebase-credential.json', () => ({}), { virtual: true });

describe('messaging service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('addToken', () => {
		it('should add a new token if it does not exist', async () => {
			// Arrange
			const initialTokens = { tokens: ['token1'] };
			const newToken = 'token2';
			fs.readFile.mockResolvedValue(JSON.stringify(initialTokens));
			fs.writeFile.mockResolvedValue(undefined);

			// Act
			const result = await addToken(newToken);

			// Assert
			expect(result).toBe(true);
			expect(fs.writeFile).toHaveBeenCalledWith(
				expect.any(String),
				JSON.stringify({ tokens: ['token1', 'token2'] }, null, 2)
			);
		});

		it('should not add a token if it already exists', async () => {
			// Arrange
			const initialTokens = { tokens: ['token1'] };
			const existingToken = 'token1';
			fs.readFile.mockResolvedValue(JSON.stringify(initialTokens));

			// Act
			const result = await addToken(existingToken);

			// Assert
			expect(result).toBe(false);
			expect(fs.writeFile).not.toHaveBeenCalled();
		});
	});

	describe('removeToken', () => {
		it('should remove a token if it exists', async () => {
			// Arrange
			const initialTokens = { tokens: ['token1', 'token2'] };
			const tokenToRemove = 'token1';
			fs.readFile.mockResolvedValue(JSON.stringify(initialTokens));
			fs.writeFile.mockResolvedValue(undefined);

			// Act
			const result = await removeToken(tokenToRemove);

			// Assert
			expect(result).toBe(true);
			expect(fs.writeFile).toHaveBeenCalledWith(
				expect.any(String),
				JSON.stringify({ tokens: ['token2'] }, null, 2)
			);
		});

		it('should not change the tokens if the token to remove does not exist', async () => {
			// Arrange
			const initialTokens = { tokens: ['token1', 'token2'] };
			const tokenToRemove = 'token3';
			fs.readFile.mockResolvedValue(JSON.stringify(initialTokens));

			// Act
			const result = await removeToken(tokenToRemove);

			// Assert
			expect(result).toBe(true);
			expect(fs.writeFile).not.toHaveBeenCalled();
		});
	});

	describe('sendNotification', () => {
		it('should send a notification to all registered tokens', async () => {
			// Arrange
			const tokens = ['token1', 'token2'];
			fs.readFile.mockResolvedValue(JSON.stringify({ tokens }));
			const mockSend = getMessaging().send;
			mockSend.mockResolvedValue({ success: true });

			const title = 'Test Title';
			const body = 'Test Body';
			const type = 'receipt';
			const target = 'test/target';

			// Act
			await sendNotification(title, body, type, target);

			// Assert
			expect(mockSend).toHaveBeenCalledTimes(2);
			expect(mockSend).toHaveBeenCalledWith({
				token: 'token1',
				data: {
					icon: `https://money.nanbean.net/${type}.png`,
					badge: 'https://money.nanbean.net/badge.png',
					title,
					body,
					click_action: `./${target}`
				},
				webpush: { headers: { Urgency: 'high', TTL: '86400' } }
			});
			expect(mockSend).toHaveBeenCalledWith({
				token: 'token2',
				data: {
					icon: `https://money.nanbean.net/${type}.png`,
					badge: 'https://money.nanbean.net/badge.png',
					title,
					body,
					click_action: `./${target}`
				},
				webpush: { headers: { Urgency: 'high', TTL: '86400' } }
			});
		});

		it('발송 결과(메시지 ID·오류 코드)를 토큰 끝 6자리와 함께 로그로 남긴다', async () => {
			// Arrange
			fs.readFile.mockResolvedValue(JSON.stringify({ tokens: ['aaaaaa-ok1234', 'bbbbbb-bad567'] }));
			const mockSend = getMessaging().send;
			mockSend
				.mockResolvedValueOnce('projects/nanbean-money/messages/msg-1')
				.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'messaging/internal-error' }));
			const log = jest.spyOn(console, 'log').mockImplementation(() => {});
			jest.spyOn(console, 'error').mockImplementation(() => {});

			// Act
			await sendNotification('NetWorth Update', 'body');

			// Assert
			const line = log.mock.calls.find(c => c[0] === '[push] sent');
			expect(JSON.parse(line[1])).toEqual({
				title: 'NetWorth Update',
				results: [
					{ token: '…ok1234', status: 'fulfilled', id: 'msg-1' },
					{ token: '…bad567', status: 'rejected', error: 'messaging/internal-error' }
				]
			});
			log.mockRestore();
			console.error.mockRestore();
		});

		it('should handle the case with no tokens', async () => {
			// Arrange
			fs.readFile.mockResolvedValue(JSON.stringify({ tokens: [] }));
			const mockSend = getMessaging().send;

			// Act
			await sendNotification('Test Title', 'Test Body');

			// Assert
			expect(mockSend).not.toHaveBeenCalled();
		});
	});
});
