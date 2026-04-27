// Design tokens from design_handoff_money_app/README.md
// Phase C-1 scope: inline here, will graduate to theme/index.js in Phase 1.

const DARK = {
	bg: '#0a0a0f',
	surf: '#15151c',
	surf2: '#1d1d26',
	ink: '#f5f5f8',
	ink2: '#9999a8',
	ink3: '#5a5a68',
	rule: '#26262f',
	pos: '#4ade80',
	neg: '#f87171'
};

const LIGHT = {
	bg: '#fafaf7',
	surf: '#ffffff',
	surf2: '#f5f5f0',
	ink: '#1a1a1f',
	ink2: '#6b6b75',
	ink3: '#a8a8b0',
	rule: '#e8e8e3',
	pos: '#0f6e3f',
	neg: '#b73a3a'
};

// `bg` = solid pale shade for tinted icon boxes in LIGHT mode (Tailwind {color}-50).
// `deep` = very dark shade for icon/text on `bg` in LIGHT mode (Tailwind {color}-950).
// `tint` (translucent) is kept for DARK mode where rgba layering reads well over the dark surface.
export const ACCENTS = {
	indigo:     { hero: '#4338ca', bright: '#818cf8', tint: 'rgba(67,56,202,0.12)',   bg: '#eef0ff', deep: '#1e1b4b' },
	forest:     { hero: '#15803d', bright: '#4ade80', tint: 'rgba(21,128,61,0.12)',   bg: '#f0fdf4', deep: '#052e16' },
	terracotta: { hero: '#c2410c', bright: '#fb923c', tint: 'rgba(194,65,12,0.12)',   bg: '#fff7ed', deep: '#431407' },
	slate:      { hero: '#475569', bright: '#94a3b8', tint: 'rgba(71,85,105,0.12)',   bg: '#f8fafc', deep: '#020617' },
	wine:       { hero: '#9f1239', bright: '#fb7185', tint: 'rgba(159,18,57,0.12)',   bg: '#fff1f2', deep: '#4c0519' },
	teal:       { hero: '#0f766e', bright: '#2dd4bf', tint: 'rgba(15,118,110,0.12)',  bg: '#f0fdfa', deep: '#042f2e' }
};

export const ACCENT_LABELS = {
	indigo:     { en: 'Indigo',     ko: '인디고' },
	forest:     { en: 'Forest',     ko: '포레스트' },
	terracotta: { en: 'Terracotta', ko: '테라코타' },
	slate:      { en: 'Slate',      ko: '슬레이트' },
	wine:       { en: 'Wine',       ko: '와인' },
	teal:       { en: 'Teal',       ko: '틸' }
};

export const tokens = (isDark = true, accentName = 'indigo') => ({
	...(isDark ? DARK : LIGHT),
	dark: isDark,
	acc: ACCENTS[accentName] || ACCENTS.indigo
});

export const sDisplay = {
	fontFamily: '"Space Grotesk","Pretendard",system-ui,-apple-system,sans-serif',
	letterSpacing: '-0.03em'
};

export const sMono = {
	fontFamily: '"JetBrains Mono","Roboto Mono",ui-monospace,monospace',
	fontVariantNumeric: 'tabular-nums'
};

export const labelStyle = (T) => ({
	fontSize: 11,
	fontWeight: 600,
	textTransform: 'uppercase',
	letterSpacing: '0.06em',
	color: T.ink2
});

export const colorFor = (T, n) => (n > 0 ? T.pos : n < 0 ? T.neg : T.ink2);

// Korean myriads abbreviation: 1억 / 1만 / raw
export const fmtKRW = (n) => {
	if (!Number.isFinite(n)) return '₩0';
	const sign = n < 0 ? '−' : '';
	const abs = Math.abs(n);
	if (abs >= 100000000) return `${sign}₩${(abs / 100000000).toFixed(2)}억`;
	if (abs >= 10000) return `${sign}₩${Math.round(abs / 10000).toLocaleString()}만`;
	return `${sign}₩${Math.round(abs).toLocaleString()}`;
};

export const fmtCurrency = (n, currency) => {
	if (!Number.isFinite(n)) return currency === 'USD' ? '$0' : '₩0';
	if (currency === 'USD') {
		const sign = n < 0 ? '−' : '';
		const abs = Math.abs(n);
		if (abs >= 1000) return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
		return `${sign}$${abs.toFixed(2)}`;
	}
	return fmtKRW(n);
};

export const fmtPrice = (p, currency) => {
	if (!Number.isFinite(p)) return '—';
	if (currency === 'USD') return `$${p.toFixed(2)}`;
	return `₩${Math.round(p).toLocaleString()}`;
};

export const fmtQty = (q) => {
	if (!Number.isFinite(q)) return '—';
	return Number.isInteger(q) ? q.toLocaleString() : q.toLocaleString('en-US', { maximumFractionDigits: 4 });
};

// Bilingual label component-friendly formatter
export const bilingual = (en, ko) => `${en} · ${ko}`;
