// Memo tag parsing — keeps the user's free-form `memo` field as the source of
// truth, but normalizes inconsistent spacing/punctuation and derives
// structured fields onto the transaction doc for accurate reporting.
//
// Recognized tags:
//   credit:N           카드사 credit 사용 (AmEx 등) — 숫자 필수
//   refund 또는 refund:N  환불 — 값 선택 (없으면 amount로 추론)
//   gift:이름           증여 받은 사람
//   allowance:이름       용돈 받은 사람
//   support:이름         부양/송금 받은 사람
//
// Half-width / full-width colon (':' / '：') and any whitespace around the
// colon are accepted. The normalize step converts everything to the canonical
// `keyword:value` form, so future parsing/reporting sees a single shape.

const TAG_DEFS = [
	{
		id: 'credit',
		emoji: '💳',
		// 'credit' followed by colon (half/full width) and a positive number
		regex: /\bcredit\s*[:：]\s*([0-9]+(?:\.[0-9]+)?)/gi,
		canonical: (_m, v) => `credit:${v}`,
		toPreview: (v) => ({ id: 'credit', label: `💳 credit ${v}`, value: Number(v) })
	},
	{
		id: 'refund',
		emoji: '↩',
		// 'refund' as a token, optionally followed by colon and a number
		regex: /\brefund(?:\s*[:：]\s*([0-9]+(?:\.[0-9]+)?))?\b/gi,
		canonical: (_m, v) => (v ? `refund:${v}` : 'refund'),
		toPreview: (v) => ({ id: 'refund', label: v ? `↩ refund ${v}` : '↩ refund', value: v ? Number(v) : true })
	},
	{
		id: 'gift',
		emoji: '🎁',
		regex: /\bgift\s*[:：]\s*([^\s,;]+)/gi,
		canonical: (_m, v) => `gift:${v}`,
		toPreview: (v) => ({ id: 'gift', label: `🎁 gift ${v}`, value: v })
	},
	{
		id: 'allowance',
		emoji: '💵',
		regex: /\ballowance\s*[:：]\s*([^\s,;]+)/gi,
		canonical: (_m, v) => `allowance:${v}`,
		toPreview: (v) => ({ id: 'allowance', label: `💵 allowance ${v}`, value: v })
	},
	{
		id: 'support',
		emoji: '🤝',
		regex: /\bsupport\s*[:：]\s*([^\s,;]+)/gi,
		canonical: (_m, v) => `support:${v}`,
		toPreview: (v) => ({ id: 'support', label: `🤝 support ${v}`, value: v })
	}
];

// Convert sloppy spacing/full-width punctuation to canonical form.
// `credit : 11` / `credit ： 11` / `Credit:11` → `credit:11`
export const normalizeMemo = (memo) => {
	if (!memo || typeof memo !== 'string') return memo;
	let result = memo;
	for (const def of TAG_DEFS) {
		// Reset lastIndex defensively; replace ignores it but new RegExp keeps state safer.
		const re = new RegExp(def.regex.source, def.regex.flags);
		result = result.replace(re, def.canonical);
	}
	return result;
};

// Extract recognized tags as preview-ready chips. Multiple matches per tag
// type are returned as separate chips.
export const extractMemoTags = (memo) => {
	if (!memo || typeof memo !== 'string') return [];
	const out = [];
	for (const def of TAG_DEFS) {
		const re = new RegExp(def.regex.source, def.regex.flags);
		let match;
		while ((match = re.exec(memo)) !== null) {
			out.push(def.toPreview(match[1]));
		}
	}
	return out;
};

// Derive structured fields to attach to the transaction doc. Only the *first*
// occurrence of each tag is kept here (typical case). If a doc has multiple
// `gift:` entries, additional ones can be inspected via memo.
export const deriveMemoFields = (memo) => {
	if (!memo || typeof memo !== 'string') return {};
	const out = {};

	const credit = memo.match(/\bcredit\s*[:：]\s*([0-9]+(?:\.[0-9]+)?)/i);
	if (credit) out.creditApplied = Number(credit[1]);

	const refund = memo.match(/\brefund(?:\s*[:：]\s*([0-9]+(?:\.[0-9]+)?))?\b/i);
	if (refund) {
		out.refund = true;
		if (refund[1]) out.refundAmount = Number(refund[1]);
	}

	const gift = memo.match(/\bgift\s*[:：]\s*([^\s,;]+)/i);
	if (gift) {
		out.giftTo = gift[1];
		out.giftKind = 'gift';
	}

	const allowance = memo.match(/\ballowance\s*[:：]\s*([^\s,;]+)/i);
	if (allowance) {
		out.giftTo = allowance[1];
		out.giftKind = 'allowance';
	}

	const support = memo.match(/\bsupport\s*[:：]\s*([^\s,;]+)/i);
	if (support) {
		out.giftTo = support[1];
		out.giftKind = 'support';
	}

	return out;
};

// All keys we may add. Used to clear stale fields on edit when memo changes.
export const MEMO_DERIVED_KEYS = ['creditApplied', 'refund', 'refundAmount', 'giftTo', 'giftKind'];

// Apply normalize + derive on a transaction-like object in place. Removes
// previously-derived fields if the new memo no longer carries that tag, so
// editing a memo to drop `credit:11` properly clears `creditApplied`.
export const applyMemoTags = (tx) => {
	if (!tx || typeof tx !== 'object') return tx;
	if (typeof tx.memo === 'string' && tx.memo.length > 0) {
		tx.memo = normalizeMemo(tx.memo);
		const derived = deriveMemoFields(tx.memo);
		for (const k of MEMO_DERIVED_KEYS) delete tx[k];
		Object.assign(tx, derived);
	} else {
		// memo cleared → drop any previously-derived fields
		for (const k of MEMO_DERIVED_KEYS) delete tx[k];
	}
	return tx;
};
