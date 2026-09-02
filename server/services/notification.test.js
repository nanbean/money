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
			
			// KB국민카드는 같은 내용이 두 형식으로 온다. 줄바꿈만 공백으로 바꾸면
			// 동일해진다 — 실측 266건에서 두 형식 모두 파싱된다.
			it('should parse a KB card notification in the newline format', async () => {
				// Arrange
				const body = {
					packageName: 'com.kbcard.kbkookmincard',
					text: 'KB국민카드1*8*승인\n김*심님\n14,160원 일시불\n09/02 16:13\n11번가\n누적120,830원'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction.mock.calls[0][0]).toMatchObject({
					date: moment('09/02', 'MM/DD').format('YYYY-MM-DD'),
					amount: -14160,
					payee: '11번가',
					accountId: 'account:CCard:KB카드'
				});
			});

			// 취소는 거래를 만들지 않는다. 원본을 자동으로 찾아 고치려면 상호·금액·
			// 날짜로 지목해야 하는데, 실측 재생에서 같은 상호의 다른 결제를 집는
			// 경우가 나왔다. 사람이 판단한다.
			it('안드로이드 취소는 거래를 만들지 않는다', async () => {
				// Arrange
				const body = {
					packageName: 'com.kbcard.kbkookmincard',
					text: 'KB국민카드1*8*취소\n김*심\n9,100원 일시불\n10/30 19:16\n메가엠지씨커피\n누적151,820원'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction).not.toHaveBeenCalled();
			});

			it('ios.KBPay 취소도 거래를 만들지 않는다', async () => {
				// Arrange
				const body = {
					packageName: 'ios.KBPay',
					text: 'KB국민카드6036취소 김*심님 14,160원 일시불 09/02 16:13 11번가 누적106,670'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction).not.toHaveBeenCalled();
			});

			// 승인은 그대로 음수여야 한다 — 부호 판정이 첫 줄만 본다는 것을 고정한다.
			it('should keep an Android KB card approval negative', async () => {
				// Arrange
				const body = {
					packageName: 'com.kbcard.kbkookmincard',
					text: 'KB국민카드1*8*승인\n김*심\n9,100원 일시불\n10/30 19:16\n메가엠지씨커피\n누적160,920원'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction.mock.calls[0][0]).toMatchObject({ amount: -9100 });
			});

			// 상호에 '취소' 가 들어가도 부호가 뒤집히면 안 된다 — 첫 줄만 본다.
			it('should not flip the sign when a merchant name contains 취소', async () => {
				// Arrange
				const body = {
					packageName: 'com.kbcard.kbkookmincard',
					text: 'KB국민카드1*8*승인\n김*심\n3,000원 일시불\n10/30 19:16\n취소전문점\n누적160,920원'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction.mock.calls[0][0])
					.toMatchObject({ amount: -3000, payee: '취소전문점' });
			});

			// 한 줄 형식은 ios.KBPay 로 온다. 앱과 텍스트 형식이 1:1 이 아니라
			// KB 파서 하나가 세 조합을 모두 다룬다.
			it('should parse the single-line KB card format arriving from ios.KBPay', async () => {
				// Arrange
				const body = {
					packageName: 'ios.KBPay',
					text: 'KB국민카드6036승인 김*심님 14,160원 일시불 09/02 16:13 11번가 누적120,830'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction.mock.calls[0][0]).toMatchObject({
					date: moment('09/02', 'MM/DD').format('YYYY-MM-DD'),
					amount: -14160,
					payee: '11번가',
					accountId: 'account:CCard:KB카드'
				});
			});

			// 상호 위치가 고정되지 않고 공백도 들어간다 — 인덱스 분할로는 잘린다.
			it('should keep spaces inside a KB card merchant name from ios.KBPay', async () => {
				// Arrange
				const body = {
					packageName: 'ios.KBPay',
					text: 'KB국민카드1*8*승인 김*심 100,000원 일시불 05/24 14:27 셀렉토커피 동탄 누적1,000원'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction.mock.calls[0][0])
					.toMatchObject({ amount: -100000, payee: '셀렉토커피 동탄' });
			});

			// 전각 공백(U+3000)이 상호에 들어온다. 공백 전체를 정규화하면 뭉개진다.
			it('should preserve an ideographic space in a KB card merchant name', async () => {
				// Arrange
				const body = {
					packageName: 'com.kbcard.kbkookmincard',
					text: 'KB국민카드1*8*승인\n김*심\n62,773원 일시불\n01/21 18:43\n（유）　아웃백\n누적144,053원'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction.mock.calls[0][0].payee).toBe('（유）　아웃백');
			});

			// 할부 표기가 없어도(또는 개월수여도) 날짜를 기준으로 맞춰야 한다.
			it('should parse a KB Pay message without an installment token', async () => {
				// Arrange
				const body = {
					packageName: 'ios.KBPay',
					text: 'KB국민카드6036승인 김*심님 5,000원 09/02 16:13 편의점 누적120,830'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction.mock.calls[0][0])
					.toMatchObject({ amount: -5000, payee: '편의점' });
			});

			// iOS KB Pay 는 한 줄 공백 구분이고 앞에 \n, 뒤에 공백이 붙는다.
			// 안드로이드 KB국민카드 알림과 같은 카드라 KB카드로 기록한다.
			it('should correctly parse an iOS KB Pay (ios.KBPay) notification', async () => {
				// Arrange
				const body = {
					packageName: 'ios.KBPay',
					text: '\n[KB Pay 사용 알림] 신용 6036 09/02 16:13 14,160원 11번가 승인 '
				};

				// Act
				await addTransaction(body);

				// Assert
				const transactionArg = transactionService.addTransaction.mock.calls[0][0];
				expect(transactionArg).toMatchObject({
					date: moment('09/02', 'MM/DD').format('YYYY-MM-DD'),
					amount: -14160,
					payee: '11번가',
					accountId: 'account:CCard:KB카드'
				});
			});

			// 상호에 공백이 들어간다 — 인덱스 분할로는 잘린다.
			it('should keep spaces inside a KB Pay merchant name', async () => {
				// Arrange
				const body = {
					packageName: 'ios.KBPay',
					text: '\n[KB Pay 사용 알림] 체크 1234 03/31 14:38 11,500원 텐퍼센트 레이크 승인 '
				};

				// Act
				await addTransaction(body);

				// Assert
				const transactionArg = transactionService.addTransaction.mock.calls[0][0];
				expect(transactionArg).toMatchObject({ amount: -11500, payee: '텐퍼센트 레이크' });
			});

			// 취소가 지출로 기록되면 안 된다.
			it('should not record a transaction for a KB Pay cancellation', async () => {
				// Arrange
				const body = {
					packageName: 'ios.KBPay',
					text: '\n[KB Pay 사용 알림] 신용 6036 09/02 16:13 14,160원 11번가 취소 '
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction).not.toHaveBeenCalled();
			});

			// 결제일 안내처럼 거래가 아닌 알림도 잡되 거래는 만들지 않는다.
			// 매처를 좁히면 이런 메시지가 'Failed to find parser' 로 빠진다.
			it('should not record a transaction for a KB Pay non-purchase notice', async () => {
				// Arrange
				const body = {
					packageName: 'ios.KBPay',
					text: '\n[KB Pay] 9월 결제예정금액은 1,234,000원입니다'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction).not.toHaveBeenCalled();
			});

			// [Web발신] NH카드6*4*승인 / 김*심 / 52,000원 / 08/28 14:16 / 최선도
			// SC은행BC·우리·현대카드와 같은 6줄 SMS 형식이다. 즉시 인출되는
			// 체크카드라 급여계좌(Bank)로 기록한다.
			it('should correctly parse an NH card (NH카드) SMS notification', async () => {
				// Arrange
				const body = {
					packageName: 'com.google.android.apps.messaging',
					text: '[Web발신]\nNH카드6*4*승인\n김*심\n52,000원\n08/28 14:16\n최선도'
				};
				const expectedDate = moment('08/28', 'MM/DD').format('YYYY-MM-DD');

				// Act
				await addTransaction(body);

				// Assert
				const transactionArg = transactionService.addTransaction.mock.calls[0][0];
				expect(transactionArg).toMatchObject({
					date: expectedDate,
					amount: -52000,
					payee: '최선도',
					accountId: 'account:Bank:급여계좌'
				});
			});

			// 카드번호 마스킹은 자리마다 다르다 — 숫자만인 경우도 받아야 한다.
			it('should parse an NH card SMS with a different card-number mask', async () => {
				// Arrange
				const body = {
					packageName: 'com.google.android.apps.messaging',
					text: '[Web발신]\nNH카드1234승인\n김*심\n7,900원\n01/03 09:05\n스타벅스'
				};

				// Act
				await addTransaction(body);

				// Assert
				const transactionArg = transactionService.addTransaction.mock.calls[0][0];
				expect(transactionArg).toMatchObject({
					date: moment('01/03', 'MM/DD').format('YYYY-MM-DD'),
					amount: -7900,
					payee: '스타벅스'
				});
			});

			// 승인취소는 맨 앞 파서가 먼저 잡아 빈 결과를 낸다 — 거래를 만들지 않는다.
			it('should not record a transaction for an NH card cancellation', async () => {
				// Arrange
				const body = {
					packageName: 'com.google.android.apps.messaging',
					text: '[Web발신]\nNH카드6*4*승인취소\n김*심\n52,000원\n08/28 14:16\n최선도'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction).not.toHaveBeenCalled();
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
