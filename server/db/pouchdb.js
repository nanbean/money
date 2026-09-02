const fs = require('fs');
const path = require('path');
const config = require('../config');
const PouchDB = require('pouchdb');
const { createStringPool } = require('../utils/stringPool');

// PouchDB 는 브라우저에서 IndexedDB 를 쓰지만 Node 에서는 leveldb 로 떨어지고,
// DB 이름 그대로 현재 디렉토리에 폴더를 만든다. 그래서 리포지토리 루트에
// 'transactions/' 가 생겨 git 변경점으로 떴다.
//
// 한 곳에 모아 둔다. __dirname 기준 절대 경로여야 한다 — pm2 가 ecosystem 의
// cwd(/home/ubuntu/money)로 띄우지만, 도구나 스크립트를 다른 위치에서 실행하면
// 상대 경로는 폴더를 여기저기 흩뿌린다.
//
// prefix 는 leveldb 경로의 접두어로 쓰이고, PouchDB 는 상위 폴더를 만들어 주지
// 않는다 (없으면 'IO error: ... LOCK: No such file or directory').
const POUCH_DIR = path.resolve(__dirname, '..', '.pouchdb') + path.sep;
fs.mkdirSync(POUCH_DIR, { recursive: true });

// 이 폴더는 CouchDB 복제본 캐시다. 지워도 다음 기동에 다시 채워진다.
const transactionsDB = new PouchDB('transactions', { prefix: POUCH_DIR });

// In-memory transaction cache
let allTransactions = [];
// 캐시가 문서 28,000건을 그대로 들고 있어서 문자열 중복이 컸다. 같은 값을 공유해
// 보유량을 12.6MB -> 8.6MB 로 줄인다. 자세한 배경은 utils/stringPool.js 주석 참고.
// 프로세스가 매일 04:00 에 재시작되므로(ecosystem cron_restart) 풀은 하루마다 비워진다.
const stringPool = createStringPool();
// A Promise to track if the cache is being initialized or has been completed
let isCacheInitialized = null;

/**
 * Incrementally updates the cache.
 * Used in the PouchDB 'change' event handler.
 * @param {object} change - The PouchDB change object
 */
const updateCacheIncrementally = (change) => {
	// Do not process if `change.doc` is missing
	if (!change.doc) {
		return;
	}

	const index = allTransactions.findIndex(t => t._id === change.id);

	if (change.deleted) {
		// If the document was deleted
		if (index !== -1) {
			allTransactions.splice(index, 1);
			// console.log(`Cache updated: removed transaction ${change.id}`);
		}
	} else if (index !== -1) {
		// Update existing document
		allTransactions[index] = stringPool.intern(change.doc);
		// console.log(`Cache updated: updated transaction ${change.id}`);
	} else {
		// Add new document
		allTransactions.push(stringPool.intern(change.doc));
		// console.log(`Cache updated: added transaction ${change.id}`);
	}
};

const initPouchDB = () => {
	const remoteTransactionsDB = new PouchDB(`https://${config.couchDBAdminId}:${config.couchDBAdminPassword}@${config.couchDBUrl}/transactions_nanbean`, { skip_setup: true });

	// Set up the cache initialization Promise
	isCacheInitialized = transactionsDB.allDocs({ include_docs: true })
		.then(response => {
			allTransactions = response.rows.map(row => stringPool.intern(row.doc));
			// console.log(`Transaction cache initialized with ${allTransactions.length} documents.`);
		})
		.catch(err => {
			console.error('Failed to initialize transaction cache:', err);
			return Promise.resolve(); // Prevent app blocking on failure
		});

	// Real-time replication and change detection
	PouchDB.replicate(remoteTransactionsDB, transactionsDB, {
		live: true,
		retry: true,
		include_docs: true // Required to include the doc in the change event
	}).on('change', (change) => {
		isCacheInitialized.then(() => {
			if (Array.isArray(change.docs)) {
				change.docs.forEach(docChange => updateCacheIncrementally({ doc: docChange, id: docChange._id, deleted: docChange._deleted }));
			} else {
				updateCacheIncrementally(change);
			}
		});
	}).on('error', (err) => {
		console.error('PouchDB replication error:', err);
	});
};

exports.getAllTransactions = async () => {
	// Wait for the cache initialization to complete
	await isCacheInitialized;
	return allTransactions;
};

initPouchDB();