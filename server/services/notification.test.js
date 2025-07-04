const notification = require('./notification');
const { addTransaction, getHistory } = notification;
const messaging = require('./messaging');
const moment = require('moment-timezone');
const settingService = require('./settingService');
const transactionService = require('./transactionService');
const notificationService = require('./notificationService');

// Mock dependencies
jest.mock('./settingService', () => ({
	getCategoryList: jest.fn()
}));
jest.mock('./transactionService', () => ({
	getAllTransactions: jest.fn(),
	addTransaction: jest.fn()
}));
jest.mock('./notificationService', () => ({
	addNotification: jest.fn(),
	listNotifications: jest.fn()
}));

jest.mock('./messaging', () => ({
	sendNotification: jest.fn()
}));

// Mock Google Generative AI
const mockSendMessage = jest.fn();
const mockStartChat = jest.fn(() => ({
	sendMessage: mockSendMessage
}));
const mockGetGenerativeModel = jest.fn(() => ({
	startChat: mockStartChat
}));
jest.mock('@google/generative-ai', () => ({
	GoogleGenerativeAI: jest.fn(() => ({
		// 호출 시점에 mockGetGenerativeModel를 참조하도록 함수로 감싸줍니다.
		getGenerativeModel: (...args) => mockGetGenerativeModel(...args)
	})),
	HarmCategory: {},
	HarmBlockThreshold: {}
}));

describe('notification service', () => {
	// 각 테스트 전에 모든 mock을 초기화합니다.
	beforeEach(() => {
		jest.clearAllMocks();
		// 중복 확인 로직의 시간 제어를 위해 fake timer를 사용합니다.
		jest.useFakeTimers();
		if (notification.reset) {
			notification.reset();
		}
		jest.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('getHistory', () => {
		it('should call notificationService.listNotifications and return the result', async () => {
			// Arrange
			const mockHistory = [
				'text: \'notification1\'',
				'title: \'T2\', text: \'notification2\''
			];
			notificationService.listNotifications.mockResolvedValue(mockHistory);
			const size = 2;

			// Act
			const result = await getHistory(size);

			// Assert
			expect(notificationService.listNotifications).toHaveBeenCalledWith(size);
			expect(result).toEqual(mockHistory);
		});
	});

	describe('addTransaction', () => {
		beforeEach(() => {
			// addTransaction 테스트를 위한 공통 mock 설정
			transactionService.getAllTransactions.mockResolvedValue([]);
			settingService.getCategoryList.mockResolvedValue(['식비', '교통비', '생활용품']);
			mockSendMessage.mockResolvedValue({ response: { text: () => '식비' } });
		});

		it('should return false for duplicated transactions within 10 seconds', async () => {
			// Arrange
			const body = {
				packageName: 'com.usbank.mobilebanking',
				text: 'PURCHASE SKYPASS Visa Signature® Card 2901 BAB Great Mall $44.84.'
			};
			
			// Act
			// 첫 번째 호출로 마지막 거래 내역을 기록
			const firstCallResult = await addTransaction(body); 
			// 5초 후 다시 호출
			jest.advanceTimersByTime(5000); 
			const secondCallResult = await addTransaction(body);

			// Assert
			expect(firstCallResult).toBe(true);
			expect(secondCallResult).toBe(false);
			// DB에는 한 번만 추가되어야 함
			expect(transactionService.addTransaction).toHaveBeenCalledTimes(1);
		});

		it('should process transaction if it is not a duplicate (time elapsed)', async () => {
			// Arrange
			const body = {
				packageName: 'com.usbank.mobilebanking',
				text: 'PURCHASE SKYPASS Visa Signature® Card 2901 Wow Mall $44.84.'
			};
			
			// Act
			await addTransaction(body);
			// 11초 후 다시 호출
			jest.advanceTimersByTime(11000); 
			await addTransaction(body);

			// Assert
			expect(transactionService.addTransaction).toHaveBeenCalledTimes(2);
		});

		it('should return false if body is incomplete', async () => {
			expect(await addTransaction({})).toBe(false);
			expect(await addTransaction({ packageName: 'test' })).toBe(false);
			expect(await addTransaction({ text: 'test' })).toBe(false);
		});

		it('should do nothing for cancellation messages', async () => {
			// Arrange
			const body = { packageName: 'com.kbcard.kbkookmincard', text: '승인취소 some text' };
			
			// Act
			const result = await addTransaction(body);

			// Assert
			expect(transactionService.addTransaction).not.toHaveBeenCalled();
			// 파싱 실패로 간주하여 실패 알림 전송
			expect(messaging.sendNotification).toHaveBeenCalledWith('⚠️ Transaction', 'Failed to parse transaction', 'receipt');
			expect(result).toBe(false);
		});

		describe('Transaction Parsing', () => {
			it('should correctly parse an American Express (com.americanexpress.android.acctsvcs.us) notification', async () => {
				// Arrange
				const body = {
					packageName: 'com.americanexpress.android.acctsvcs.us',
					text: 'American Express: A charge of $25.50 was just approved on your Card ending in 12345 at STARBUCKS.'
				};
				const expectedDate = moment().tz('America/Los_Angeles').format('YYYY-MM-DD');

				// Act
				await addTransaction(body);

				// Assert
				const transactionArg = transactionService.addTransaction.mock.calls[0][0];
				expect(transactionArg).toMatchObject({
					date: expectedDate,
					amount: -25.50,
					payee: 'STARBUCKS',
					accountId: 'account:Bank:BoA'
				});
			});

			it('should correctly parse a Samsung Check Card (삼성체크) notification', async () => {
				// Arrange
				const body = {
					packageName: 'some.app',
					text: '[삼성체크]승인\n이*정\n5,000원\n12/26 08:00\n파리바게뜨'
				};
				const expectedDate = moment('12/26', 'MM/DD').format('YYYY-MM-DD');

				// Act
				await addTransaction(body);

				// Assert
				const transactionArg = transactionService.addTransaction.mock.calls[0][0];
				expect(transactionArg).toMatchObject({
					date: expectedDate,
					amount: -5000,
					payee: '파리바게뜨',
					accountId: 'account:CCard:생활비카드'
				});
			});
			
			it('should correctly parse a Robinhood (com.robinhood.money) notification', async () => {
				// Arrange
				const body = {
					packageName: 'com.robinhood.money',
					title: 'Metromile',
					text: '$140.78 (+422 Points)'
				};
				const expectedDate = moment().tz('America/Los_Angeles').format('YYYY-MM-DD');

				// Act
				await addTransaction(body);

				// Assert
				const transactionArg = transactionService.addTransaction.mock.calls[0][0];
				expect(transactionArg).toMatchObject({
					date: expectedDate,
					amount: -140.78,
					payee: 'Metromile',
					accountId: 'account:Bank:BoA'
				});
			});

			it('should do nothing parse a Robinhood (com.robinhood.money) for Upcoming payment messages', async () => {
				// Arrange
				const body = {
					packageName: 'com.robinhood.money',
					title: 'Upcoming payment',
					text: '$3000'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction).not.toHaveBeenCalled();
			});

			it('should correctly parse a US Bank (com.usbank.mobilebanking) notification', async () => {
				// Arrange
				const body = {
					packageName: 'com.usbank.mobilebanking',
					text: 'PURCHASE SKYPASS Visa Signature® Card 2901 SOME MERCHANT $12.34.'
				};
				const expectedDate = moment().tz('America/Los_Angeles').format('YYYY-MM-DD');

				// Act
				await addTransaction(body);

				// Assert
				const transactionArg = transactionService.addTransaction.mock.calls[0][0];
				expect(transactionArg).toMatchObject({
					date: expectedDate,
					amount: -12.34,
					payee: 'SOME MERCHANT',
					accountId: 'account:Bank:BoA'
				});
			});
		});

		describe('Category Finding Logic', () => {
			it('should find category from existing transactions', async () => {
				// Arrange
				const existingTransaction = {
					payee: '스타벅스',
					category: '식비',
					subcategory: '카페'
				};
				transactionService.getAllTransactions.mockResolvedValue([existingTransaction]);
				const body = {
					packageName: 'com.usbank.mobilebanking',
					text: 'PURCHASE SKYPASS Visa Signature® Card 2901 스타벅스 $44.84.'
				};

				// Act
				await addTransaction(body);

				// Assert
				const transactionArg = transactionService.addTransaction.mock.calls[0][0];
				expect(transactionArg).toMatchObject({
					payee: '스타벅스',
					category: '식비',
					subcategory: '카페'
				});
				// Gemini API는 호출되지 않아야 함
				expect(mockGetGenerativeModel).not.toHaveBeenCalled();
			});

			it('should call Gemini to find category if no existing transaction is found', async () => {
				// Arrange
				transactionService.getAllTransactions.mockResolvedValue([]); // 기존 거래 내역 없음
				mockSendMessage.mockResolvedValue({ response: { text: () => '생활용품:잡화' } });
				const body = {
					packageName: 'com.usbank.mobilebanking',
					text: 'PURCHASE SKYPASS Visa Signature® Card 2901 Lemonade $44.84.'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(mockGetGenerativeModel).toHaveBeenCalled();
				expect(mockSendMessage).toHaveBeenCalledWith('What is the best expense category for Lemonade?');
				
				const transactionArg = transactionService.addTransaction.mock.calls[0][0];
				expect(transactionArg).toMatchObject({
					payee: 'Lemonade',
					category: '생활용품',
					subcategory: '잡화'
				});
			});
		});

		it('should return false and send a failure notification if parsing fails', async () => {
			// Arrange
			const body = {
				packageName: 'some.app',
				text: 'This is an unparseable message'
			};

			// Act
			const result = await addTransaction(body);

			// Assert
			expect(result).toBe(false);
			expect(transactionService.addTransaction).not.toHaveBeenCalled();
			expect(messaging.sendNotification).toHaveBeenCalledWith('⚠️ Transaction', 'Failed to find parser', 'receipt');
		});
	});
});
