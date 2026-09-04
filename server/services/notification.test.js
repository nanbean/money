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
			// 실제 취소 알림에는 금액이 있다. 금액이 없으면 거래일 수 없어
			// 조용히 버려지므로(no-amount) 알림 여부를 볼 수 없다.
			const body = {
				packageName: 'com.kbcard.kbkookmincard',
				text: 'KB국민카드1*8*승인취소\n김*심\n9,100원 일시불\n10/30 19:16\n메가엠지씨커피'
			};

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

			// 필드가 어긋난 요청도 로그로 보여야 한다. 그러지 않으면 "요청이
			// 안 왔다" 와 "형식이 다르다" 가 로그에서 똑같이 아무것도 아니다.
			describe('형식이 어긋난 요청', () => {
				test.each([
					['text 없음', { packageName: 'ios.NHPay' }],
					['필드 이름 다름', { packageName: 'ios.NHPay', message: 'NH카드6*4*승인' }],
					['packageName 없음', { text: 'NH카드6*4*승인' }],
					['빈 본문', { packageName: 'ios.NHPay', text: '' }],
					['빈 객체', {}]
				])('%s 을 거부하고 로그를 남긴다', async (_label, body) => {
					// Arrange
					const log = jest.spyOn(console, 'log').mockImplementation(() => {});

					// Act
					const result = await addTransaction(body);

					// Assert
					expect(result).toBe(false);
					expect(transactionService.addTransaction).not.toHaveBeenCalled();
					expect(log.mock.calls.some(([first]) => String(first).includes('[notify] rejected')))
						.toBe(true);

					log.mockRestore();
				});
			});

			// 회귀 방지. 예전에는 ios.* 만 남겨서, 안드로이드·SMS 알림은 거래가
			// 기록돼도 어느 앱이 보냈는지 로그에서 알 수 없었다.
			describe('알림 로그', () => {
				const capture = async (body) => {
					const log = jest.spyOn(console, 'log').mockImplementation(() => {});
					await addTransaction(body);
					const lines = log.mock.calls.map((c) => c.map(String).join(' '));
					log.mockRestore();
					return lines;
				};

				test.each([
					['안드로이드 KB', {
						packageName: 'com.kbcard.kbkookmincard',
						text: 'KB국민카드\n승인\n14,160원\n09/02\n11번가'
					}],
					['SMS (packageName 이 메시지앱)', {
						packageName: 'com.google.android.apps.messaging',
						text: '[Web발신]\nNH카드6*4*승인\n김*심\n52,000원\n08/28 14:16\n최선도'
					}],
					['iOS NH Pay', {
						packageName: 'ios.NHPay',
						text: 'NH카드6*4*승인\n김*심\n52,000원 일시불\n08/28 12:03\n최선도'
					}]
				])('%s 의 packageName 을 남긴다', async (_label, body) => {
					// Act
					const lines = await capture(body);

					// Assert
					const received = lines.find((l) => l.includes('[notify] received'));
					expect(received).toBeDefined();
					expect(received).toContain(body.packageName);
				});

				// 어느 파서가 잡았는지 알아야 잘못 잡힌 경우를 추적할 수 있다.
				it('기록 시 파서 인덱스를 남긴다', async () => {
					// Act
					const lines = await capture({
						packageName: 'ios.NHPay',
						text: 'NH카드6*4*승인\n김*심\n52,000원 일시불\n08/28 12:03\n최선도'
					});

					// Assert
					const recorded = lines.find((l) => l.includes('[notify] recorded'));
					expect(recorded).toContain('"parserIndex"');
					expect(recorded).toContain('"payee":"최선도"');
				});

				it('파서가 없으면 no-parser 를 남긴다', async () => {
					// Act
					const lines = await capture({ packageName: 'com.unknown.app', text: '알 수 없는 알림' });

					// Assert
					expect(lines.some((l) => l.includes('[notify] no-parser'))).toBe(true);
				});
			});

			// 광고는 거래도 만들지 않고 ⚠️ 푸시도 보내지 않는다. 예전에는 롯데
			// 파서(#4)까지 흘러가서 파싱 실패 알림이 떴다.
			describe('광고 알림', () => {
				// 2026-09-03 실측 원문 두 건.
				const ADS = [
					['룰렛 광고', 'ios.lottecard', '(광고)100% 당첨되는 행운 룰렛 돌려요\n최대 1만 띵코인 획득 찬스\r\n\r\n※ 수신거부: 전체메뉴-내 카드 정보-알림 설정'],
					// 본문에 '65,365원' 이 들어 있다. 금액처럼 보이는 광고도 버려야 한다.
					['특가 광고', 'ios.lottecard', '(광고)[~15%쿠폰]단 하루 하기스 띵샵 특가\n[29%]보송보송 팬티형 2팩*2박스 65,365원\r\n\r\n※ 수신거부: 전체메뉴-내 카드 정보-알림 설정'],
					['SMS 광고', 'com.google.android.apps.messaging', '[Web발신](광고)NH카드 이벤트 안내'],
					['앞에 개행', 'ios.KBPay', '\n(광고)KB Pay 첫 결제 이벤트']
				];

				test.each(ADS)('%s 를 거래 없이 버린다', async (_label, packageName, text) => {
					// Act
					const result = await addTransaction({ packageName, text });

					// Assert
					expect(result).toBe(false);
					expect(transactionService.addTransaction).not.toHaveBeenCalled();
				});

				test.each(ADS)('%s 는 푸시를 보내지 않는다', async (_label, packageName, text) => {
					// Act
					await addTransaction({ packageName, text });

					// Assert
					expect(messaging.sendNotification).not.toHaveBeenCalled();
				});

				it('광고로 버린 것을 로그에 남긴다', async () => {
					// Arrange
					const log = jest.spyOn(console, 'log').mockImplementation(() => {});

					// Act
					await addTransaction({ packageName: 'ios.lottecard', text: ADS[0][2] });
					const lines = log.mock.calls.map((c) => c.map(String).join(' '));
					log.mockRestore();

					// Assert
					expect(lines.some((l) => l.includes('[notify] skipped') && l.includes('advertisement')))
						.toBe(true);
				});
			});

			// 거래가 아닌 안내 알림. 금액이 아예 없으면 거래일 수 없다.
			//
			// 예전에는 ⚠️ '파싱 실패' 로 떠서 진짜 파서 고장과 섞였다.
			// 문구 키워드로 막으면 카드사가 새 안내를 만들 때마다 새 규칙이
			// 필요하다. 금액 유무로 가른다.
			describe('금액 없는 안내 알림', () => {
				// 2026-09-03 22:24 / 2026-09-04 09:32 실측 원문.
				const NOTICES = [
					['행운박스 이용안내', 'ios.lottecard', '행운박스 이용안내\n쿠팡 행운박스 참여가 완료되었습니다.'],
					['모바일교환권 안내', 'ios.lottecard', '오은미님, 7월 행운박스 모바일교환권 보내드려요.\n참여하신 이벤트: 26년 7월 쿠팡 행운박스 리워드\r\n내가 받은 모바일교환권 확인하기'],
					['숫자만 있는 안내', 'ios.KBPay', 'KB Pay 앱 업데이트 안내\n버전 26.9 배포']
				];

				test.each(NOTICES)('%s 는 거래를 만들지 않는다', async (_label, packageName, text) => {
					// Act
					const result = await addTransaction({ packageName, text });

					// Assert
					expect(result).toBe(false);
					expect(transactionService.addTransaction).not.toHaveBeenCalled();
				});

				test.each(NOTICES)('%s 는 푸시를 보내지 않는다', async (_label, packageName, text) => {
					// Act
					await addTransaction({ packageName, text });

					// Assert
					expect(messaging.sendNotification).not.toHaveBeenCalled();
				});

				it('no-amount 로 로그를 남긴다', async () => {
					// Arrange
					const log = jest.spyOn(console, 'log').mockImplementation(() => {});

					// Act
					await addTransaction({ packageName: NOTICES[1][1], text: NOTICES[1][2] });
					const lines = log.mock.calls.map((c) => c.map(String).join(' '));
					log.mockRestore();

					// Assert
					expect(lines.some((l) => l.includes('[notify] skipped') && l.includes('no-amount')))
						.toBe(true);
				});

				// 여기가 핵심이다. 금액이 있으면 파서 고장을 계속 알려야 한다.
				test.each([
					['원화', 'ios.lottecard', '알 수 없는 형식\n12,345원 뭔가'],
					['달러', 'com.usbank.mobilebanking', 'SOMETHING WEIRD $44.84 happened'],
					['소수점', 'ios.KBPay', '이상한 형식 44.84 어쩌구']
				])('%s 금액이 있으면 ⚠️ 를 그대로 띄운다', async (_label, packageName, text) => {
					// Act
					await addTransaction({ packageName, text });

					// Assert
					expect(messaging.sendNotification.mock.calls
						.some(([t]) => String(t).includes('⚠️'))).toBe(true);
				});

				// 실제 거래 알림이 이 규칙에 걸리면 거래를 조용히 잃는다.
				it('실제 거래 알림은 걸리지 않는다', async () => {
					// Act
					await addTransaction({
						packageName: 'com.usbank.mobilebanking',
						text: 'PURCHASE SKYPASS Visa Signature® Card 2901 SOME MERCHANT $12.34.'
					});

					// Assert
					expect(transactionService.addTransaction).toHaveBeenCalled();
				});
			});

			// 롯데카드 후불교통 이용금액 안내. KB 와 달리 실제 승인일이 온다.
			describe('iOS 롯데카드 후불교통', () => {
				// 2026-09-03 10:01 실측 원문.
				const REAL = '오*미님의 08월 후불교통 이용금액이에요!\n교통카드는 2번 이용해 3,300원이 나왔어요. \r\n이용금액은 09월 02일에 승인되었어요.';
				const lotte = (text) => ({ packageName: 'ios.lottecard', text });

				it('승인일에 생활비카드 교통비로 기록한다', async () => {
					// Arrange
					jest.setSystemTime(new Date('2026-09-03T10:01:00+09:00'));

					// Act
					await addTransaction(lotte(REAL));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0]).toMatchObject({
						_id: '2026-09-02:생활비카드:후불교통',
						date: '2026-09-02',
						amount: -3300,
						payee: '후불교통',
						accountId: 'account:CCard:생활비카드',
						category: '교통비',
						subcategory: '대중교통',
						memo: '2번'
					});
				});

				// 승인일은 지난 날짜다. 연초에 지난해 12월 안내가 오면 올해로 떨어진다.
				it('연초에 오는 지난해 승인일을 되돌린다', async () => {
					// Arrange
					jest.setSystemTime(new Date('2027-01-05T10:01:00+09:00'));

					// Act
					await addTransaction(lotte('오*미님의 12월 후불교통 이용금액이에요!\n교통카드는 9번 이용해 12,100원이 나왔어요.\n이용금액은 12월 28일에 승인되었어요.'));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0].date).toBe('2026-12-28');
				});

				// KB 와 같은 dedupeKey 를 쓰지만 계좌가 달라 _id 가 겹치지 않는다.
				it('KB 후불교통과 _id 가 겹치지 않는다', async () => {
					// Arrange
					jest.setSystemTime(new Date('2026-09-03T10:01:00+09:00'));

					// Act
					await addTransaction(lotte(REAL));
					const lotteId = transactionService.addTransaction.mock.calls[0][0]._id;
					jest.clearAllMocks();
					transactionService.getAllTransactions.mockResolvedValue([]);
					await addTransaction({
						packageName: 'ios.KBPay',
						text: '\nKB국민카드\n후불교통(신용)\n28건 51,250원\n09/15 결제예정 '
					});

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0]._id).not.toBe(lotteId);
				});

				// 금액이나 승인일이 없으면 거래를 만들지 않는다.
				test.each([
					['금액 없음', '오*미님의 08월 후불교통 이용금액이에요!\n이용금액은 09월 02일에 승인되었어요.'],
					['승인일 없음', '오*미님의 08월 후불교통 이용금액이에요!\n교통카드는 2번 이용해 3,300원이 나왔어요.']
				])('%s 이면 거래를 만들지 않는다', async (_label, text) => {
					// Act
					await addTransaction(lotte(text));

					// Assert
					expect(transactionService.addTransaction).not.toHaveBeenCalled();
				});

				// 일반 승인 알림이 이 분기에 걸려서는 안 된다.
				it('일반 승인 알림은 그대로 처리한다', async () => {
					// Act
					await addTransaction(lotte('\n씨유(CU)동탄지오점\n1,650원 승인\nLOCA LIKIT 2.0(7*2*)\n일시불, 09/03 17:18\n누적금액 882,380원'));

					// Assert
					const saved = transactionService.addTransaction.mock.calls[0][0];
					expect(saved.payee).toBe('씨유(CU)동탄지오점');
					expect(saved.amount).toBe(-1650);
					expect(saved._id).not.toContain('후불교통');
				});
			});

			// 취소 알림. 원장은 건드리지 않고 후보만 알린다.
			//
			// 자동 적용을 포기한 근거는 실측이다 — 2026년 카드 거래 248건 중
			// 81건(32.7%)이 '계좌 + 날짜 + 상호' 가 같은 묶음에 있고, 부분취소는
			// 금액 조건이 상한만 걸어주므로 후보가 안 갈린다.
			describe('iOS KB Pay 부분취소', () => {
				// 2026-09-04 09:02 실측 원문.
				const REAL = '\n[KB국민카드] 8033 오*미님 쿠팡(쿠페이)-쿠 08/31 이용건 09/03 부분취소(-22,900원)';
				const cancelBody = (text) => ({ packageName: 'ios.KBPay', text });

				// 알림에 저장된 payee 보다 상호가 길게 온다. 08-31 에 쿠팡 결제가
				// 둘인데 하나는 이미 0원이라 취소액을 흡수할 수 없다.
				const ORIGINAL = {
					_id: '2026-08-31:KB카드오은미:fc2c6df0',
					date: '2026-08-31',
					accountId: 'account:CCard:KB카드오은미',
					amount: -42090,
					payee: '쿠팡'
				};
				const ZEROED = {
					_id: '2026-08-31:KB카드오은미:ac662c00',
					date: '2026-08-31',
					accountId: 'account:CCard:KB카드오은미',
					amount: 0,
					payee: '쿠팡',
					memo: '취소:15690'
				};

				beforeEach(() => {
					jest.setSystemTime(new Date('2026-09-04T09:02:00+09:00'));
					transactionService.getAllTransactions.mockResolvedValue([ORIGINAL, ZEROED]);
				});

				it('거래를 만들지 않는다', async () => {
					// Act
					const result = await addTransaction(cancelBody(REAL));

					// Assert
					expect(result).toBe(false);
					expect(transactionService.addTransaction).not.toHaveBeenCalled();
				});

				// 원장을 자동으로 고치지 않는 것이 이 기능의 핵심이다.
				it('원거래를 고치지 않는다', async () => {
					// Act
					await addTransaction(cancelBody(REAL));

					// Assert
					expect(ORIGINAL.amount).toBe(-42090);
					expect(notificationService.addNotification).not.toHaveBeenCalled();
				});

				it('후보와 취소 후 금액을 푸시로 알린다', async () => {
					// Act
					await addTransaction(cancelBody(REAL));

					// Assert
					const [title, text] = messaging.sendNotification.mock.calls[0];
					expect(title).toBe('🔁 취소 확인 필요');
					expect(text).toContain('KB카드오은미');
					expect(text).toContain('부분취소 22,900원');
					expect(text).toContain('쿠팡(쿠페이)-쿠');
					expect(text).toContain('후보 1건');
					// -42,090 + 22,900 = -19,190
					expect(text).toContain('-42,090 → -19,190');
				});

				// 이미 0원인 건은 취소액을 흡수할 수 없다. 푸시 문구로는 가릴 수
				// 없어(-42,090 → 안에 '0 → ' 가 들어 있다) 로그의 후보 목록을 본다.
				it('금액이 부족한 건은 후보에서 뺀다', async () => {
					// Arrange
					const log = jest.spyOn(console, 'log').mockImplementation(() => {});

					// Act
					await addTransaction(cancelBody(REAL));
					const line = log.mock.calls.map((c) => c.map(String).join(' '))
						.find((l) => l.includes('[notify] skipped'));
					log.mockRestore();

					// Assert
					expect(line).toContain(ORIGINAL._id);
					expect(line).not.toContain(ZEROED._id);
					expect(messaging.sendNotification.mock.calls[0][1]).toContain('후보 1건');
				});

				// 파싱 실패와 구분돼야 한다.
				it('⚠️ 대신 취소로 로그를 남긴다', async () => {
					// Arrange
					const log = jest.spyOn(console, 'log').mockImplementation(() => {});

					// Act
					await addTransaction(cancelBody(REAL));
					const lines = log.mock.calls.map((c) => c.map(String).join(' '));
					log.mockRestore();

					// Assert
					expect(lines.some((l) => l.includes('[notify] skipped') && l.includes('cancellation')))
						.toBe(true);
					expect(messaging.sendNotification.mock.calls
						.some(([t]) => String(t).includes('⚠️'))).toBe(false);
				});

				it('후보가 여럿이면 모두 보여준다', async () => {
					// Arrange
					transactionService.getAllTransactions.mockResolvedValue([
						{ ...ORIGINAL, _id: 'a', amount: -68400 },
						{ ...ORIGINAL, _id: 'b', amount: -30750 },
						{ ...ORIGINAL, _id: 'c', amount: -22950 }
					]);

					// Act
					await addTransaction(cancelBody(REAL));

					// Assert
					const [, text] = messaging.sendNotification.mock.calls[0];
					expect(text).toContain('후보 3건');
					// 금액이 작은 것부터 — 순위를 주장하지 않고 나열만 한다.
					expect(text.indexOf('-22,950')).toBeLessThan(text.indexOf('-68,400'));
				});

				it('후보가 없으면 그렇다고 알린다', async () => {
					// Arrange
					transactionService.getAllTransactions.mockResolvedValue([]);

					// Act
					await addTransaction(cancelBody(REAL));

					// Assert
					expect(messaging.sendNotification.mock.calls[0][1])
						.toContain('후보를 찾지 못했습니다');
				});

				// 이용일과 거래 날짜가 어긋나는 경우가 있다.
				it('정확한 날짜에 없으면 ±3일로 넓힌다', async () => {
					// Arrange
					transactionService.getAllTransactions.mockResolvedValue([
						{ ...ORIGINAL, date: '2026-09-01' }
					]);

					// Act
					await addTransaction(cancelBody(REAL));

					// Assert
					const [, text] = messaging.sendNotification.mock.calls[0];
					expect(text).toContain('이용일 ±3일');
					expect(text).toContain('2026-09-01');
				});

				// 모르는 카드번호는 엉뚱한 계좌를 뒤지게 된다.
				it('모르는 카드번호는 처리하지 않는다', async () => {
					// Act
					await addTransaction(cancelBody('\n[KB국민카드] 9999 오*미님 쿠팡 08/31 이용건 09/03 부분취소(-22,900원)'));

					// Assert
					expect(messaging.sendNotification)
						.toHaveBeenCalledWith('⚠️ Transaction', 'Failed to parse transaction', 'receipt');
				});

				// 일반 승인 알림이 이 분기에 걸려서는 안 된다.
				it('일반 승인 알림은 그대로 처리한다', async () => {
					// Arrange
					transactionService.getAllTransactions.mockResolvedValue([]);

					// Act
					await addTransaction(cancelBody('\nKB국민카드8033승인 오*미님 21,970원 일시불 09/03 22:24 쿠팡(쿠페이) 누적493,185원'));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0])
						.toMatchObject({ amount: -21970, payee: '쿠팡(쿠페이)' });
				});
			});

			// 후불교통 청구 예정액. 탈 때마다 오지 않고 한 건으로 모여서 온다.
			describe('iOS KB Pay 후불교통', () => {
				// 2026-09-03 실측 원문.
				const REAL = '\nKB국민카드\n후불교통(신용)\n28건 51,250원\n09/15 결제예정 ';
				const transit = (text) => ({ packageName: 'ios.KBPay', text });

				it('결제예정일에 교통비로 기록한다', async () => {
					// Arrange
					jest.setSystemTime(new Date('2026-09-03T10:20:00+09:00'));

					// Act
					await addTransaction(transit(REAL));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0]).toMatchObject({
						date: '2026-09-15',
						amount: -51250,
						payee: '후불교통',
						accountId: 'account:CCard:KB카드',
						category: '교통비',
						subcategory: '대중교통',
						memo: '28건'
					});
				});

				// dedupeKey 가 _id 로 들어가야 같은 청구건이 한 건으로 모인다.
				it('_id 에 uuid 대신 dedupeKey 를 쓴다', async () => {
					// Arrange
					jest.setSystemTime(new Date('2026-09-03T10:20:00+09:00'));

					// Act
					await addTransaction(transit(REAL));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0]._id)
						.toBe('2026-09-15:KB카드:후불교통');
				});

				// 제어 값은 transaction 밖(options)에 있어야 문서로 새지 않는다.
				it('제어 값을 문서에 넣지 않는다', async () => {
					// Act
					await addTransaction(transit(REAL));

					// Assert
					const saved = transactionService.addTransaction.mock.calls[0][0];
					expect(saved).not.toHaveProperty('dedupeKey');
					expect(saved).not.toHaveProperty('fixedCategory');
					expect(saved).not.toHaveProperty('options');
				});

				// findCategoryByPayee 는 이력이 없으면 Gemini 답으로 파서의 분류를
				// 덮는다. 후불교통은 확정적이라 물어선 안 된다.
				it('Gemini 에 묻지 않고 교통비로 둔다', async () => {
					// Arrange
					mockSendMessage.mockResolvedValue({ response: { text: () => '식비' } });

					// Act
					await addTransaction(transit(REAL));

					// Assert
					expect(mockSendMessage).not.toHaveBeenCalled();
					expect(transactionService.addTransaction.mock.calls[0][0]).toMatchObject({
						category: '교통비',
						subcategory: '대중교통'
					});
				});

				// 건수가 늘어 다시 온다. 새로 쌓으면 지출이 두 배가 된다.
				describe('같은 청구건이 다시 올 때', () => {
					const existing = {
						_id: '2026-09-15:KB카드:후불교통',
						_rev: '3-abc',
						date: '2026-09-15',
						amount: -51250,
						payee: '후불교통',
						category: '교통비',
						subcategory: '대중교통',
						memo: '28건'
					};

					beforeEach(() => {
						jest.setSystemTime(new Date('2026-09-10T10:20:00+09:00'));
						transactionService.getAllTransactions.mockResolvedValue([existing]);
					});

					it('_rev 를 실어 갱신한다', async () => {
						// Act
						await addTransaction(transit('\nKB국민카드\n후불교통(신용)\n35건 62,400원\n09/15 결제예정 '));

						// Assert
						expect(transactionService.addTransaction.mock.calls[0][0]).toMatchObject({
							_id: '2026-09-15:KB카드:후불교통',
							_rev: '3-abc',
							amount: -62400,
							memo: '35건'
						});
					});

					// 손으로 고친 분류를 알림이 되돌려 놓으면 고칠 방법이 없어진다.
					it('사용자가 고친 분류를 유지한다', async () => {
						// Act
						await addTransaction(transit('\nKB국민카드\n후불교통(신용)\n35건 62,400원\n09/15 결제예정 '));

						// Assert
						expect(transactionService.addTransaction.mock.calls[0][0]).toMatchObject({
							category: '교통비',
							subcategory: '대중교통'
						});
					});
				});

				// 결제예정일은 앞을 보는 날짜다. MM/DD 만 오므로 해를 넘길 때
				// 올해로 떨어진다.
				it('연말에 오는 다음 해 결제예정일을 넘긴다', async () => {
					// Arrange
					jest.setSystemTime(new Date('2026-12-20T10:20:00+09:00'));

					// Act
					await addTransaction(transit('\nKB국민카드\n후불교통(신용)\n12건 21,000원\n01/15 결제예정 '));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0].date).toBe('2027-01-15');
				});

				// 기존 두 형식이 이 분기에 걸려서는 안 된다.
				it('일반 승인 알림은 그대로 처리한다', async () => {
					// Act
					await addTransaction(transit('\n[KB Pay 사용 알림] 신용 6036 09/02 16:13 14,160원 11번가 승인 '));

					// Assert
					const saved = transactionService.addTransaction.mock.calls[0][0];
					expect(saved.payee).toBe('11번가');
					expect(saved._id).not.toContain('후불교통');
				});
			});

			// iOS NH Pay. 급여계좌로 기록한다 — SMS 로 오는 같은 카드(6*4*)와 같다.
			//
			// 줄바꿈으로 오는지 공백으로 오는지 확실하지 않아 둘 다 받는다.
			describe('iOS NH Pay', () => {
				const nh = (text) => ({ packageName: 'ios.NHPay', text });
				// 2026-09-03 실측. 앱 이름 줄이 앞에 붙고 이후 줄은 \r\n 이며
				// 마지막이 '총누적135,486원' 이다.
				const REAL = 'NH농협카드\nNH카드6*4*승인\r\n김*심\r\n11,500원 일시불\r\n09/03 04:49\r\n11번가\r\n총누적135,486원';
				const NEWLINE = 'NH카드6*4*승인\n김*심\n52,000원 일시불\n08/28 12:03\n최선도';
				const SPACED = 'NH카드6*4*승인 김*심 52,000원 일시불 08/28 12:03 최선도';

				test.each([
					['줄바꿈 구분', NEWLINE],
					['공백 구분', SPACED],
					['앞에 개행', `\n${NEWLINE}`]
				])('%s 를 급여계좌로 기록한다', async (_label, text) => {
					// Act
					await addTransaction(nh(text));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0]).toMatchObject({
						date: moment('08/28', 'MM/DD').format('YYYY-MM-DD'),
						amount: -52000,
						payee: '최선도',
						accountId: 'account:Bank:급여계좌'
					});
				});

				// 실측 원문. '총누적' 을 못 떼서 payee 가
				// '11번가 총누적135,486원' 으로 기록된 적이 있다.
				it('실측 원문의 총누적 필드를 떼어낸다', async () => {
					// Act
					await addTransaction(nh(REAL));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0]).toMatchObject({
						date: '2026-09-03',
						amount: -11500,
						payee: '11번가',
						accountId: 'account:Bank:급여계좌'
					});
				});

				test.each([
					['이름에 님', 'NH카드6*4*승인\n김*심님\n52,000원 일시불\n08/28 12:03\n최선도'],
					['일시불 없음', 'NH카드6*4*승인\n김*심\n52,000원\n08/28 12:03\n최선도'],
					['누적 붙음', 'NH카드6*4*승인\n김*심\n52,000원 일시불\n08/28 12:03\n최선도\n누적880,801원'],
					['총누적 붙음', 'NH카드6*4*승인\n김*심\n52,000원 일시불\n08/28 12:03\n최선도\n총누적880,801원'],
					['누적금액 붙음', 'NH카드6*4*승인\n김*심\n52,000원 일시불\n08/28 12:03\n최선도\n당월누적880,801']
				])('%s 도 받는다', async (_label, text) => {
					// Act
					await addTransaction(nh(text));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0])
						.toMatchObject({ amount: -52000, payee: '최선도' });
				});

				// 상호가 마지막이고 공백이 들어갈 수 있다 — 뒤에서부터 최소 일치시킨다.
				it('상호의 공백을 유지한다', async () => {
					// Act
					await addTransaction(nh('NH카드6*4*승인\n김*심\n52,000원 일시불\n08/28 12:03\n이마트 에브리데이 동탄호수점'));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0].payee)
						.toBe('이마트 에브리데이 동탄호수점');
				});

				// 카드번호 마스킹은 자리마다 다르고 숫자만 오는 경우도 있다.
				it('마스킹되지 않은 카드번호도 받는다', async () => {
					// Act
					await addTransaction(nh('NH카드6042승인\n김*심\n7,900원 일시불\n01/03 09:05\n스타벅스'));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0])
						.toMatchObject({ amount: -7900, payee: '스타벅스' });
				});

				test.each([
					['취소', 'NH카드6*4*취소\n김*심\n52,000원 일시불\n08/28 12:03\n최선도'],
					['형식 다름', '[NH카드] 9월 결제예정금액은 1,234,000원입니다']
				])('%s 는 거래를 만들지 않는다', async (_label, text) => {
					// Act
					await addTransaction(nh(text));

					// Assert
					expect(transactionService.addTransaction).not.toHaveBeenCalled();
				});

				// SMS 파서는 텍스트로 매칭한다. ios 를 claim 하지 않아야 순서와
				// 무관하게 각자 자기 알림만 처리한다.
				it('SMS NH 알림은 여전히 SMS 파서가 처리한다', async () => {
					// Act
					await addTransaction({
						packageName: 'com.google.android.apps.messaging',
						text: '[Web발신]\nNH카드6*4*승인\n김*심\n52,000원\n08/28 14:16\n최선도'
					});

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0]).toMatchObject({
						amount: -52000,
						payee: '최선도',
						accountId: 'account:Bank:급여계좌'
					});
				});
			});

			// iOS 롯데카드. 전부 생활비카드로 기록한다.
			//
			// KB 와 순서가 반대다 — 상호가 첫 줄, 금액·상태가 둘째 줄이다.
			describe('iOS 롯데카드', () => {
				const lotte = (text) => ({ packageName: 'ios.lottecard', text });
				// 실제 수신 문구
				const REAL = '\n십일번가 주식회사\n13,050원 승인\nLOCA LIKIT 2.0(7*2*)\n일시불, 09/02 22:08\n누적금액 880,801원';

				it('실제 문구를 생활비카드로 기록한다', async () => {
					// Act
					await addTransaction(lotte(REAL));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0]).toMatchObject({
						date: moment('09/02', 'MM/DD').format('YYYY-MM-DD'),
						amount: -13050,
						payee: '십일번가 주식회사',
						accountId: 'account:CCard:생활비카드'
					});
				});

				// 상호에 공백이 들어간다 — 첫 줄을 통째로 쓴다.
				it('상호의 공백을 유지한다', async () => {
					// Act
					await addTransaction(lotte('이마트 에브리데이 동탄호수점\n4,980원 승인\nLOCA LIKIT 2.0(7*2*)\n일시불, 09/02 20:25'));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0])
						.toMatchObject({ amount: -4980, payee: '이마트 에브리데이 동탄호수점' });
				});

				it('할부도 받는다', async () => {
					// Act
					await addTransaction(lotte('\n쿠팡\n120,000원 승인\nLOCA\n3개월, 09/02 20:25\n누적금액 1원'));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0])
						.toMatchObject({ amount: -120000, payee: '쿠팡' });
				});

				// '누적금액 880,801원' 은 숫자로 시작하지 않아 금액 줄로 오인되지 않는다.
				it('누적금액 줄을 금액으로 읽지 않는다', async () => {
					// Act
					await addTransaction(lotte(REAL));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0].amount).toBe(-13050);
				});

				// 상태가 정확히 '승인' 이 아니면 거래를 만들지 않는다. 배열 맨 앞
				// 파서에 의존하지 않고 여기서 독립적으로 막는다.
				test.each(['승인취소', '취소', '부분취소', '거절'])('상태가 %s 면 거래를 만들지 않는다', async (status) => {
					// Act
					await addTransaction(lotte(REAL.replace('13,050원 승인', `13,050원 ${status}`)));

					// Assert
					expect(transactionService.addTransaction).not.toHaveBeenCalled();
				});

				// 결제 알림이 아닌 메시지는 금액·상태 줄이나 날짜가 없다.
				test.each([
					['결제예정 안내', '[롯데카드] 9월 결제예정금액은 1,234,000원입니다'],
					['날짜 없음', '\n이마트\n4,980원 승인\nLOCA'],
					['금액 줄이 첫 줄', '\n4,980원 승인\nLOCA\n일시불, 09/02 20:25']
				])('%s 는 거래를 만들지 않는다', async (_label, text) => {
					// Act
					await addTransaction(lotte(text));

					// Assert
					expect(transactionService.addTransaction).not.toHaveBeenCalled();
				});

				it('ios.lettecard 는 이 파서가 잡지 않는다', async () => {
					// Act
					await addTransaction({ packageName: 'ios.lettecard', text: REAL });

					// Assert
					expect(transactionService.addTransaction).not.toHaveBeenCalled();
				});

				// KB 카드 알림이 롯데 파서로 새면 안 된다.
				it('KB 카드 알림은 KB 계좌로 간다', async () => {
					// Act
					await addTransaction({
						packageName: 'ios.KBPay',
						text: 'KB국민카드6036승인 김*심님 5,000원 일시불 09/02 16:13 쿠팡 누적50,000'
					});

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0].accountId)
						.toBe('account:CCard:KB카드');
				});
			});

			// 한 앱에서 여러 사람의 카드 알림이 온다. 카드번호로 계좌를 가른다.
			describe('KB Pay 카드번호별 계좌', () => {
				const payBody = (card) => ({
					packageName: 'ios.KBPay',
					text: `\n[KB Pay 사용 알림] 신용 ${card} 09/02 16:13 5,000원 쿠팡 승인 `
				});
				const cardBody = (card) => ({
					packageName: 'ios.KBPay',
					text: `KB국민카드${card}승인 김*심님 5,000원 일시불 09/02 16:13 쿠팡 누적50,000`
				});

				test.each([
					['6036', 'account:CCard:KB카드'],
					['8031', 'account:CCard:KB카드'],
					['8033', 'account:CCard:KB카드오은미']
				])('KB Pay 형식 %s -> %s', async (card, accountId) => {
					// Act
					await addTransaction(payBody(card));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0])
						.toMatchObject({ amount: -5000, payee: '쿠팡', accountId });
				});

				test.each([
					['6036', 'account:CCard:KB카드'],
					['8031', 'account:CCard:KB카드'],
					['8033', 'account:CCard:KB카드오은미']
				])('국민카드 형식 %s -> %s', async (card, accountId) => {
					// Act
					await addTransaction(cardBody(card));

					// Assert
					expect(transactionService.addTransaction.mock.calls[0][0])
						.toMatchObject({ amount: -5000, payee: '쿠팡', accountId });
				});

				// 엉뚱한 계좌에 기록하는 것보다 알림만 띄우는 편이 낫다.
				it('모르는 카드번호는 거래를 만들지 않는다', async () => {
					// Act
					await addTransaction(payBody('9999'));
					await addTransaction(cardBody('7777'));

					// Assert
					expect(transactionService.addTransaction).not.toHaveBeenCalled();
				});

				// 마스킹된 번호는 안드로이드 알림 형식이다. iOS 로 오면 특정할 수 없다.
				it('마스킹된 번호는 거래를 만들지 않는다', async () => {
					// Act
					await addTransaction(cardBody('1*8*'));

					// Assert
					expect(transactionService.addTransaction).not.toHaveBeenCalled();
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
					text: 'KB국민카드6036승인 김*심 100,000원 일시불 05/24 14:27 셀렉토커피 동탄 누적1,000원'
				};

				// Act
				await addTransaction(body);

				// Assert
				expect(transactionService.addTransaction.mock.calls[0][0])
					.toMatchObject({ amount: -100000, payee: '셀렉토커피 동탄' });
			});

			// NH 에서 '총누적' 으로 실측됐다. KB 도 같은 형식군이라 함께 받는다.
			it('총누적 접두어가 붙어도 상호만 남긴다', async () => {
				// Act
				await addTransaction({
					packageName: 'ios.KBPay',
					text: 'KB국민카드6036승인 김*심님 14,160원 일시불 09/02 16:13 11번가 총누적120,830원'
				});

				// Assert
				expect(transactionService.addTransaction.mock.calls[0][0].payee).toBe('11번가');
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
					text: '\n[KB Pay 사용 알림] 체크 8031 03/31 14:38 11,500원 텐퍼센트 레이크 승인 '
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
