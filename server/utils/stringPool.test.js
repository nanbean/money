const { createStringPool } = require('./stringPool');

describe('createStringPool', () => {
	test('같은 값을 가진 문자열을 하나의 인스턴스로 모은다', () => {
		const pool = createStringPool();
		// JSON.parse 는 같은 내용이라도 매번 새 문자열 객체를 만든다.
		const a = JSON.parse('{"accountId":"account:CCard:생활비카드"}');
		const b = JSON.parse('{"accountId":"account:CCard:생활비카드"}');

		pool.intern(a);
		pool.intern(b);

		expect(a.accountId).toBe(b.accountId);
		expect(pool.size()).toBe(1);
	});

	test('문서 객체를 그대로 돌려주고 값은 바뀌지 않는다', () => {
		const pool = createStringPool();
		const doc = { _id: 't1', accountId: 'account:Bank:급여계좌', amount: -1000, category: '식비' };

		const result = pool.intern(doc);

		expect(result).toBe(doc);
		expect(doc).toEqual({ _id: 't1', accountId: 'account:Bank:급여계좌', amount: -1000, category: '식비' });
	});

	// delete 로 필드를 빼면 객체가 dictionary mode 로 떨어져 메모리가 오히려 늘었다.
	// 그래서 형태를 건드리지 않는다.
	test('필드를 추가하거나 제거하지 않는다', () => {
		const pool = createStringPool();
		const doc = { _id: 't1', _rev: '3-abc', date: '2026-08-14', amount: -1000 };

		pool.intern(doc);

		expect(Object.keys(doc)).toEqual(['_id', '_rev', 'date', 'amount']);
	});

	// _id/_rev 는 문서마다 고유하다. 특히 _rev 는 수정마다 바뀌어 풀만 커진다.
	test('_id 와 _rev 는 풀에 넣지 않는다', () => {
		const pool = createStringPool();
		pool.intern({ _id: 'a', _rev: '1-x', category: '식비' });
		pool.intern({ _id: 'b', _rev: '2-y', category: '식비' });

		expect(pool.size()).toBe(1); // '식비' 하나만
	});

	test('문자열이 아닌 값은 건드리지 않는다', () => {
		const pool = createStringPool();
		const division = [{ category: '식비', amount: -100 }];
		const doc = { amount: -1000, cleared: true, division, missing: null, when: undefined };

		pool.intern(doc);

		expect(doc.amount).toBe(-1000);
		expect(doc.cleared).toBe(true);
		expect(doc.division).toBe(division);
		expect(doc.missing).toBeNull();
		expect(pool.size()).toBe(0);
	});

	test('여러 필드에 걸쳐 같은 값이면 함께 공유한다', () => {
		const pool = createStringPool();
		const doc = { category: '식비', subcategory: '식비' };

		pool.intern(doc);

		expect(doc.category).toBe(doc.subcategory);
		expect(pool.size()).toBe(1);
	});

	test('빈 문자열도 정상 처리한다', () => {
		const pool = createStringPool();
		const a = JSON.parse('{"memo":""}');
		const b = JSON.parse('{"memo":""}');

		pool.intern(a);
		pool.intern(b);

		expect(a.memo).toBe('');
		expect(pool.size()).toBe(1);
	});

	test('null/undefined/원시값을 넘겨도 던지지 않는다', () => {
		const pool = createStringPool();
		expect(pool.intern(null)).toBeNull();
		expect(pool.intern(undefined)).toBeUndefined();
		expect(pool.intern('문자열')).toBe('문자열');
		expect(pool.size()).toBe(0);
	});

	test('풀은 인스턴스마다 독립이다', () => {
		const a = createStringPool();
		const b = createStringPool();

		a.intern({ category: '식비' });

		expect(a.size()).toBe(1);
		expect(b.size()).toBe(0);
	});

	test('실제 거래 형태에서 반복 필드만 모인다', () => {
		const pool = createStringPool();
		// accountId·category·date 는 반복, _id·_rev·payee 는 문서마다 다르다.
		for (let i = 0; i < 100; i++) {
			pool.intern(JSON.parse(JSON.stringify({
				_id: `tx-${i}`,
				_rev: `1-${i}`,
				accountId: 'account:CCard:생활비카드',
				date: '2026-08-14',
				category: '식비',
				subcategory: '외식',
				payee: `가맹점${i}`,
				amount: -1000 * i
			})));
		}

		// accountId, date, category, subcategory + payee 100개 = 104
		expect(pool.size()).toBe(104);
	});
});
