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
jest.mock('firebase-admin/app', () => ({
	initializeApp: jest.fn(),
	cert: jest.fn()
}));
jest.mock('firebase-admin/messaging', () => ({
	getMessaging: jest.fn(() => ({ send: mockSend }))
}));

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
				}
			});
			expect(mockSend).toHaveBeenCalledWith({
				token: 'token2',
				data: {
					icon: `https://money.nanbean.net/${type}.png`,
					badge: 'https://money.nanbean.net/badge.png',
					title,
					body,
					click_action: `./${target}`
				}
			});
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
