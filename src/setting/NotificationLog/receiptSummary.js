// 알림 수신 상태 요약 — '알림이 제대로 들어오고 있나'를 보는 용도.
//
// 알림 _id 는 `${거래 날짜}:${uuid v1}` 이다. 앞의 날짜는 거래일이라 받은 날과 다를 수
// 있다(KBPay 가 10/12 거래를 10/13 에 보낸 적이 있다). uuid v1 에는 서버가 저장한
// 시각이 들어 있으므로 수신 시각은 그걸로 계산한다.

const UUID_V1 = /([0-9a-f]{8})-([0-9a-f]{4})-1([0-9a-f]{3})-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// uuid v1 의 시각은 1582-10-15 부터의 100ns 단위다.
const GREGORIAN_OFFSET_MS = 12219292800000;

export const receivedAtFromId = (id) => {
	const m = typeof id === 'string' ? id.match(UUID_V1) : null;
	if (!m) return null;
	const [, low, mid, hi] = m;
	const ticks = parseInt(hi, 16) * 2 ** 48 + parseInt(mid, 16) * 2 ** 32 + parseInt(low, 16);
	return Math.round(ticks / 10000) - GREGORIAN_OFFSET_MS;
};

const DAY_MS = 24 * 60 * 60 * 1000;
export const WINDOW_DAYS = 7;
// 평소 하루 2~4건이다. 주말에 결제가 없을 수 있어 하루가 아니라 이틀을 넘기면 경고한다.
export const STALE_MS = 2 * DAY_MS;

const shortPackage = (pkg) => {
	if (!pkg) return '기타';
	const parts = pkg.split('.');
	return parts[parts.length - 1] || pkg;
};

/**
 * @param {Array} notifications  최신순 알림 (불러온 만큼)
 * @param {number} requested     요청한 개수. 받은 개수가 같으면 더 있을 수 있다.
 * @param {number} now           ms
 */
export const summarizeReceipts = (notifications = [], requested, now) => {
	const withTime = notifications
		.map(n => ({ ...n, receivedAt: receivedAtFromId(n._id) }))
		.filter(n => n.receivedAt);
	const last = withTime.reduce((max, n) => (n.receivedAt > max ? n.receivedAt : max), 0) || null;

	const since = now - WINDOW_DAYS * DAY_MS;
	const recent = withTime.filter(n => n.receivedAt >= since);
	const bySource = new Map();
	recent.forEach(n => {
		const key = shortPackage(n.packageName);
		bySource.set(key, (bySource.get(key) || 0) + 1);
	});

	// 불러온 목록이 7일 전까지 닿지 못했는데 서버에 더 있을 수 있으면, 건수는 하한이다.
	const oldest = withTime.length ? Math.min(...withTime.map(n => n.receivedAt)) : null;
	const partial = notifications.length >= requested && oldest !== null && oldest >= since;

	return {
		lastReceivedAt: last,
		sinceLastMs: last ? now - last : null,
		stale: last ? now - last > STALE_MS : true,
		recentCount: recent.length,
		recentPartial: partial,
		sources: [...bySource.entries()].sort((a, b) => b[1] - a[1])
	};
};
