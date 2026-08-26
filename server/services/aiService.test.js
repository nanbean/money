const moment = require('moment-timezone');

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
	GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
		getGenerativeModel: () => ({ generateContent: mockGenerateContent })
	}))
}));

jest.mock('../db/reportDB', () => ({ getReport: jest.fn(), insertReport: jest.fn() }));
jest.mock('../db/transactionDB', () => ({ getAllTransactions: jest.fn() }));
jest.mock('../db/accountDB', () => ({ listAccounts: jest.fn() }));
jest.mock('../db/stockDB', () => ({ getStock: jest.fn() }));
jest.mock('./settingService', () => ({ getExchangeRate: jest.fn() }));
jest.mock('./kisConnector', () => ({
	getKisToken: jest.fn(),
	getKisWeeklyPriceUS: jest.fn(),
	getKisWeeklyPriceKorea: jest.fn()
}));

const reportDB = require('../db/reportDB');
const transactionDB = require('../db/transactionDB');
const accountDB = require('../db/accountDB');
const stockDB = require('../db/stockDB');
const settingService = require('./settingService');
const kisConnector = require('./kisConnector');
const { getWeeklyRecap } = require('./aiService');

// 주간 리캡의 주 경계는 '가장 최근 금요일 17:00 PT'에 앵커된다. 이 계산이 틀리면
// 캐시 키가 어긋나 매 호출마다 Gemini 를 새로 부르거나, 지난 주 데이터를 보여준다.
const FRI_CLOSE = '2026-08-21 17:00'; // 금요일 17:00 PT
const atPt = (iso) => {
	jest.useFakeTimers();
	jest.setSystemTime(moment.tz(iso, 'America/Los_Angeles').valueOf());
};
// 위 금요일 마감의 KST 주차. 캐시 키와 동일해야 한다.
const weekKeyOf = (iso) => moment.tz(iso, 'America/Los_Angeles').tz('Asia/Seoul').format('GGGG-WW');
const WEEK_KEY = weekKeyOf(FRI_CLOSE);

const aiText = (text) => ({ response: { text: () => text } });

describe('getWeeklyRecap', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'log').mockImplementation(() => {});
		jest.spyOn(console, 'error').mockImplementation(() => {});

		// 최소 입력. 캐시 미스 경로에서도 예외 없이 끝까지 흘러가게 한다.
		transactionDB.getAllTransactions.mockResolvedValue([]);
		accountDB.listAccounts.mockResolvedValue([]);
		stockDB.getStock.mockResolvedValue({ data: [] });
		settingService.getExchangeRate.mockResolvedValue(1380);
		kisConnector.getKisToken.mockResolvedValue('tok');
		reportDB.insertReport.mockResolvedValue({});
		mockGenerateContent.mockResolvedValue(aiText('[SUMMARY]\n무난한 한 주\n[/SUMMARY]\n\n## 분석\n본문'));
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	const freshCache = (overrides = {}) => ({
		_id: 'weeklyRecap',
		_rev: '1-abc',
		weekKey: WEEK_KEY,
		comment: '캐시된 분석',
		summary: '캐시된 요약',
		spent: 1000,
		saved: 2000,
		topCategory: { name: '식비', value: 500, pct: 50 },
		// 마감 이후에 생성된 캐시여야 신선하다고 본다
		createdAt: moment.tz(FRI_CLOSE, 'America/Los_Angeles').add(1, 'hour').toDate(),
		...overrides
	});

	describe('캐시', () => {
		test('같은 주의 신선한 캐시가 있으면 Gemini 를 부르지 않는다', async () => {
			atPt('2026-08-22 10:00'); // 마감 다음날(토)
			reportDB.getReport.mockResolvedValue(freshCache());

			const result = await getWeeklyRecap();

			expect(mockGenerateContent).not.toHaveBeenCalled();
			expect(result).toEqual({
				comment: '캐시된 분석',
				summary: '캐시된 요약',
				spent: 1000,
				saved: 2000,
				topCategory: { name: '식비', value: 500, pct: 50 }
			});
		});

		test('weekKey 가 다르면 새로 생성한다', async () => {
			atPt('2026-08-22 10:00');
			reportDB.getReport.mockResolvedValue(freshCache({ weekKey: '2026-01' }));

			await getWeeklyRecap();

			expect(mockGenerateContent).toHaveBeenCalledTimes(1);
		});

		// 장 마감 전에 만들어진 캐시는 그 주 데이터가 아직 미완성이다.
		test('마감 전에 생성된 캐시는 신선하지 않다', async () => {
			atPt('2026-08-22 10:00');
			reportDB.getReport.mockResolvedValue(freshCache({
				createdAt: moment.tz(FRI_CLOSE, 'America/Los_Angeles').subtract(2, 'days').toDate()
			}));

			await getWeeklyRecap();

			expect(mockGenerateContent).toHaveBeenCalledTimes(1);
		});

		test('createdAt 이 없으면 신선하지 않다', async () => {
			atPt('2026-08-22 10:00');
			reportDB.getReport.mockResolvedValue(freshCache({ createdAt: undefined }));

			await getWeeklyRecap();

			expect(mockGenerateContent).toHaveBeenCalledTimes(1);
		});

		test.each([['comment'], ['summary']])('%s 가 비면 캐시를 쓰지 않는다', async (field) => {
			atPt('2026-08-22 10:00');
			reportDB.getReport.mockResolvedValue(freshCache({ [field]: '' }));

			await getWeeklyRecap();

			expect(mockGenerateContent).toHaveBeenCalledTimes(1);
		});

		test('캐시 조회가 실패해도 새로 생성한다', async () => {
			atPt('2026-08-22 10:00');
			reportDB.getReport.mockRejectedValue(new Error('conflict'));

			await expect(getWeeklyRecap()).resolves.toMatchObject({ summary: '무난한 한 주' });
			expect(mockGenerateContent).toHaveBeenCalledTimes(1);
		});

		test('생성 결과를 weekKey 와 함께 저장하고 _rev 를 물려준다', async () => {
			atPt('2026-08-22 10:00');
			reportDB.getReport.mockResolvedValue(freshCache({ weekKey: '2026-01' }));

			await getWeeklyRecap();

			const doc = reportDB.insertReport.mock.calls[0][0];
			expect(doc).toMatchObject({ _id: 'weeklyRecap', _rev: '1-abc', weekKey: WEEK_KEY });
			expect(doc.createdAt).toBeInstanceOf(Date);
		});

		test('저장이 실패해도 결과는 돌려준다', async () => {
			atPt('2026-08-22 10:00');
			reportDB.getReport.mockResolvedValue(null);
			reportDB.insertReport.mockRejectedValue(new Error('conflict'));

			await expect(getWeeklyRecap()).resolves.toMatchObject({ summary: '무난한 한 주' });
			expect(console.error).toHaveBeenCalledWith('weeklyRecap cache save error:', expect.any(Error));
		});
	});

	// 금요일 17:00 PT 마감을 기준으로, 그 이후 ~ 다음 마감 전까지는 모두 같은 주로
	// 묶여야 한다. 호출 시각이나 타임존이 달라도 캐시 키가 흔들리면 안 된다.
	describe('주 경계 앵커', () => {
		test.each([
			['마감 직후 (금 17:01 PT)', '2026-08-21 17:01'],
			['토요일', '2026-08-22 09:00'],
			['일요일', '2026-08-23 20:00'],
			['다음 주 수요일', '2026-08-26 12:00'],
			['다음 마감 직전 (금 16:59 PT)', '2026-08-28 16:59']
		])('%s 에는 같은 캐시를 재사용한다', async (_label, iso) => {
			atPt(iso);
			reportDB.getReport.mockResolvedValue(freshCache());

			await getWeeklyRecap();

			expect(mockGenerateContent).not.toHaveBeenCalled();
		});

		test('마감 직전(금 16:59)에는 그 전 주가 기준이므로 이번 주 캐시를 쓰지 않는다', async () => {
			atPt('2026-08-21 16:59');
			// 캐시는 08-21 마감 기준으로 만들어졌지만, 아직 그 마감이 오지 않았다.
			reportDB.getReport.mockResolvedValue(freshCache());

			await getWeeklyRecap();

			expect(mockGenerateContent).toHaveBeenCalledTimes(1);
		});

		test('다음 마감을 지나면 캐시가 만료된다', async () => {
			atPt('2026-08-28 17:01');
			reportDB.getReport.mockResolvedValue(freshCache());

			await getWeeklyRecap();

			expect(mockGenerateContent).toHaveBeenCalledTimes(1);
		});
	});

	describe('[SUMMARY] 파싱', () => {
		beforeEach(() => {
			atPt('2026-08-22 10:00');
			reportDB.getReport.mockResolvedValue(null);
		});

		test('SUMMARY 블록을 요약으로 뽑고 본문에서 제거한다', async () => {
			mockGenerateContent.mockResolvedValue(aiText('[SUMMARY]\n순자산 소폭 증가\n[/SUMMARY]\n\n## 분석\n상세 내용'));

			const r = await getWeeklyRecap();

			expect(r.summary).toBe('순자산 소폭 증가');
			expect(r.comment).toBe('## 분석\n상세 내용');
			expect(r.comment).not.toContain('[SUMMARY]');
		});

		test('요약 내 줄바꿈과 연속 공백을 한 칸으로 합친다', async () => {
			mockGenerateContent.mockResolvedValue(aiText('[SUMMARY]\n순자산   증가\n두번째줄\n[/SUMMARY]\n본문'));

			expect((await getWeeklyRecap()).summary).toBe('순자산 증가 두번째줄');
		});

		test('요약은 40자로 자른다', async () => {
			const long = '가'.repeat(60);
			mockGenerateContent.mockResolvedValue(aiText(`[SUMMARY]${long}[/SUMMARY]본문`));

			expect((await getWeeklyRecap()).summary).toHaveLength(40);
		});

		test('SUMMARY 블록이 없으면 전체를 본문으로 쓰고 요약은 빈 문자열', async () => {
			mockGenerateContent.mockResolvedValue(aiText('## 분석\n요약 태그 없음'));

			const r = await getWeeklyRecap();

			expect(r.summary).toBe('');
			expect(r.comment).toBe('## 분석\n요약 태그 없음');
		});

		test('태그 대소문자를 가리지 않는다', async () => {
			mockGenerateContent.mockResolvedValue(aiText('[summary]소문자 태그[/summary]본문'));

			expect((await getWeeklyRecap()).summary).toBe('소문자 태그');
		});
	});

	describe('지출/저축 집계', () => {
		beforeEach(() => {
			atPt('2026-08-22 10:00');
			reportDB.getReport.mockResolvedValue(null);
		});

		const inWeek = '2026-08-19'; // 분석 주간(월~금) 내 날짜

		test('지출은 절대값으로, 저축은 수입-지출로 계산한다', async () => {
			accountDB.listAccounts.mockResolvedValue([{ _id: 'acc1', currency: 'KRW', type: 'Bank' }]);
			transactionDB.getAllTransactions.mockResolvedValue([
				{ date: inWeek, accountId: 'acc1', amount: 1000000, category: '급여' },
				{ date: inWeek, accountId: 'acc1', amount: -300000, category: '식비' }
			]);

			const r = await getWeeklyRecap();

			expect(r.spent).toBe(300000);
			expect(r.saved).toBe(700000);
			expect(r.topCategory).toEqual({ name: '식비', value: 300000, pct: 100 });
		});

		// 차량 매각처럼 자산이 현금으로 바뀐 것은 실제 수입이 아니다.
		test('\'실제수입아님\' 은 수입 집계에서 제외한다', async () => {
			accountDB.listAccounts.mockResolvedValue([{ _id: 'acc1', currency: 'KRW', type: 'Bank' }]);
			transactionDB.getAllTransactions.mockResolvedValue([
				{ date: inWeek, accountId: 'acc1', amount: 5000000, category: '실제수입아님' },
				{ date: inWeek, accountId: 'acc1', amount: -100000, category: '식비' }
			]);

			const r = await getWeeklyRecap();

			expect(r.spent).toBe(100000);
			expect(r.saved).toBe(-100000); // 500만원이 수입으로 잡히지 않는다
		});

		test('투자 매매와 계좌 이체는 집계에서 뺀다', async () => {
			accountDB.listAccounts.mockResolvedValue([{ _id: 'acc1', currency: 'KRW', type: 'Bank' }]);
			transactionDB.getAllTransactions.mockResolvedValue([
				{ date: inWeek, accountId: 'acc1', amount: -1000000, activity: 'Buy', category: '매수' },
				{ date: inWeek, accountId: 'acc1', amount: -2000000, category: '[KB증권]' },
				{ date: inWeek, accountId: 'acc1', amount: -50000, category: '식비' }
			]);

			expect((await getWeeklyRecap()).spent).toBe(50000);
		});

		test('USD 계좌 금액은 환율로 환산한다', async () => {
			accountDB.listAccounts.mockResolvedValue([{ _id: 'usd1', currency: 'USD', type: 'Bank' }]);
			transactionDB.getAllTransactions.mockResolvedValue([
				{ date: inWeek, accountId: 'usd1', amount: -100, category: '식비' }
			]);

			expect((await getWeeklyRecap()).spent).toBe(138000); // 100 * 1380
		});

		test('분석 주간을 벗어난 거래는 무시한다', async () => {
			accountDB.listAccounts.mockResolvedValue([{ _id: 'acc1', currency: 'KRW', type: 'Bank' }]);
			transactionDB.getAllTransactions.mockResolvedValue([
				{ date: '2026-07-01', accountId: 'acc1', amount: -999999, category: '식비' },
				{ date: inWeek, accountId: 'acc1', amount: -1000, category: '식비' }
			]);

			expect((await getWeeklyRecap()).spent).toBe(1000);
		});

		// 부모 amount 는 하위 합계(순액)다. 부모만 세면 급여에서 원천 공제된 지출이
		// 통째로 빠지고 수입도 순액이 된다. saved 만 우연히 맞고 spent/topCategory 가
		// 어긋났던 문제.
		test('급여 분할의 공제 지출을 집계에 포함한다', async () => {
			accountDB.listAccounts.mockResolvedValue([{ _id: 'acc1', currency: 'KRW', type: 'Bank' }]);
			transactionDB.getAllTransactions.mockResolvedValue([{
				date: inWeek,
				accountId: 'acc1',
				category: '월급&보너스',
				amount: 4085150, // = 하위 합계
				division: [
					{ category: '월급&보너스', subcategory: '월급', description: '월급', amount: 5415960 },
					{ category: '월급&보너스', subcategory: '기타', description: '수당', amount: 986260 },
					{ category: '세금', subcategory: '소득세', description: '소득세', amount: -2000000 },
					{ category: '식비', subcategory: '외식', description: '급식비', amount: -300000 },
					{ category: '회비', description: '공제회비', amount: -17070 }
				]
			}]);

			const r = await getWeeklyRecap();

			// 공제분이 지출로 잡힌다 (예전에는 0)
			expect(r.spent).toBe(2317070);
			// 순액은 부모 금액과 같아야 한다
			expect(r.saved).toBe(4085150);
			// 최상위 지출 카테고리가 드러난다 (예전에는 null)
			expect(r.topCategory).toEqual({ name: '세금', value: 2000000, pct: 86 });
		});

		test('분할 부모 금액을 이중으로 세지 않는다', async () => {
			accountDB.listAccounts.mockResolvedValue([{ _id: 'acc1', currency: 'KRW', type: 'Bank' }]);
			transactionDB.getAllTransactions.mockResolvedValue([{
				date: inWeek,
				accountId: 'acc1',
				category: '식비',
				amount: -50000,
				division: [
					{ category: '식비', subcategory: '외식', description: '점심', amount: -30000 },
					{ category: '식비', subcategory: '장보기', description: '마트', amount: -20000 }
				]
			}]);

			const r = await getWeeklyRecap();

			expect(r.spent).toBe(50000); // 100,000 이면 이중 계산
		});

		test('지출이 없으면 topCategory 는 null', async () => {
			expect((await getWeeklyRecap()).topCategory).toBeNull();
		});

		test('최상위 카테고리는 금액이 가장 큰 대분류다', async () => {
			accountDB.listAccounts.mockResolvedValue([{ _id: 'acc1', currency: 'KRW', type: 'Bank' }]);
			transactionDB.getAllTransactions.mockResolvedValue([
				{ date: inWeek, accountId: 'acc1', amount: -30000, category: '식비:외식' },
				{ date: inWeek, accountId: 'acc1', amount: -20000, category: '식비:배달' },
				{ date: inWeek, accountId: 'acc1', amount: -40000, category: '교통' }
			]);

			const r = await getWeeklyRecap();

			// '식비:외식'/'식비:배달' 은 '식비' 로 합산되어 50,000 → 교통(40,000)보다 크다
			expect(r.topCategory.name).toBe('식비');
			expect(r.topCategory.value).toBe(50000);
			expect(r.spent).toBe(90000);
			expect(r.topCategory.pct).toBe(56);
		});
	});

	describe('dry 모드', () => {
		test('dry: true 면 Gemini 를 부르지 않고 프롬프트를 돌려준다', async () => {
			atPt('2026-08-22 10:00');
			reportDB.getReport.mockResolvedValue(null);

			const prompt = await getWeeklyRecap({ dry: true });

			expect(mockGenerateContent).not.toHaveBeenCalled();
			expect(reportDB.insertReport).not.toHaveBeenCalled();
			expect(typeof prompt).toBe('string');
			expect(prompt).toContain('[SUMMARY]');
		});
	});

	// scheduler 가 넘기는 재시도 예산이 실제로 전달되는지 확인한다.
	describe('retryOptions 전달', () => {
		test('일시 오류를 오버라이드한 횟수만큼 재시도한다', async () => {
			atPt('2026-08-22 10:00');
			reportDB.getReport.mockResolvedValue(null);
			jest.spyOn(console, 'warn').mockImplementation(() => {});
			jest.spyOn(global, 'setTimeout').mockImplementation((fn) => { fn(); return 0; });

			const err = Object.assign(new Error('high demand'), { status: 503 });
			mockGenerateContent
				.mockRejectedValueOnce(err)
				.mockRejectedValueOnce(err)
				.mockRejectedValueOnce(err)
				.mockRejectedValueOnce(err)
				.mockResolvedValue(aiText('[SUMMARY]회복[/SUMMARY]본문'));

			// 기본 예산(retries=3)이면 4번째 시도에서 포기한다. 5로 늘리면 성공해야 한다.
			const r = await getWeeklyRecap({ retryOptions: { retries: 5, baseDelay: 1, maxDelay: 2 } });

			expect(mockGenerateContent).toHaveBeenCalledTimes(5);
			expect(r.summary).toBe('회복');
		});
	});
});
