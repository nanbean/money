import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
	BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend
} from 'recharts';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import useT from '../../hooks/useT';
import { sDisplay, sMono, fmtCurrency } from '../../utils/designTokens';

const KINDS = [
	{ id: 'support', label: 'Support', ko: '부양', color: '#ef4444' },
	{ id: 'allowance', label: 'Allowance', ko: '용돈', color: '#f59e0b' },
	{ id: 'gift', label: 'Gift', ko: '선물', color: '#3b82f6' }
];
const KIND_BY_ID = Object.fromEntries(KINDS.map(k => [k.id, k]));
const KIND_IDS = KINDS.map(k => k.id);

const RANGES = ['1Y', '3Y', '5Y', 'All'];

const getStartDateStr = (range) => {
	const now = new Date();
	switch (range) {
	case '1Y': { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); }
	case '3Y': { const d = new Date(now); d.setFullYear(d.getFullYear() - 3); return d.toISOString().slice(0, 10); }
	case '5Y': { const d = new Date(now); d.setFullYear(d.getFullYear() - 5); return d.toISOString().slice(0, 10); }
	default: return null;
	}
};

function FamilyGifts () {
	const T = useT();
	const allAccountsTransactions = useSelector((s) => s.allAccountsTransactions);
	const accountList = useSelector((s) => s.accountList);
	const { exchangeRate, currency = 'KRW' } = useSelector((s) => s.settings || {});

	const [range, setRange] = useState('5Y');

	const accountCurrencyMap = useMemo(() => {
		const m = {};
		(accountList || []).forEach(a => { m[a._id] = a.currency || 'KRW'; });
		return m;
	}, [accountList]);

	const validRate = (typeof exchangeRate === 'number' && exchangeRate !== 0) ? exchangeRate : 1;

	const toDisplayAmount = useCallback((tx) => {
		const txCur = accountCurrencyMap[tx.accountId] || 'KRW';
		const abs = Math.abs(Number(tx.amount) || 0);
		if (txCur === currency) return abs;
		if (txCur === 'KRW') return abs / validRate;
		return abs * validRate;
	}, [accountCurrencyMap, currency, validRate]);

	const filtered = useMemo(() => {
		const startDate = getStartDateStr(range);
		return (allAccountsTransactions || []).filter(t =>
			KIND_IDS.includes(t.giftKind)
			&& (!startDate || t.date >= startDate)
		);
	}, [allAccountsTransactions, range]);

	const yearlyData = useMemo(() => {
		const byYear = {};
		for (const t of filtered) {
			const year = t.date.substring(0, 4);
			if (!byYear[year]) byYear[year] = { year, support: 0, allowance: 0, gift: 0 };
			byYear[year][t.giftKind] += toDisplayAmount(t);
		}
		return Object.values(byYear)
			.map(d => ({
				year: d.year,
				support: Math.round(d.support),
				allowance: Math.round(d.allowance),
				gift: Math.round(d.gift)
			}))
			.sort((a, b) => a.year.localeCompare(b.year));
	}, [filtered, toDisplayAmount]);

	const byRecipient = useMemo(() => {
		const m = new Map();
		for (const t of filtered) {
			const key = `${t.giftTo || '?'}::${t.giftKind}`;
			if (!m.has(key)) m.set(key, { recipient: t.giftTo || '?', kind: t.giftKind, total: 0, count: 0 });
			const row = m.get(key);
			row.total += toDisplayAmount(t);
			row.count += 1;
		}
		return Array.from(m.values())
			.map(v => ({ ...v, total: Math.round(v.total) }))
			.sort((a, b) => b.total - a.total)
			.slice(0, 15);
	}, [filtered, toDisplayAmount]);

	const totals = useMemo(() => {
		const out = { support: 0, allowance: 0, gift: 0 };
		for (const tx of filtered) out[tx.giftKind] += toDisplayAmount(tx);
		return out;
	}, [filtered, toDisplayAmount]);
	const grandTotal = totals.support + totals.allowance + totals.gift;

	const recent = useMemo(() => {
		return [...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
	}, [filtered]);

	const panelSx = {
		background: T.surf,
		border: `1px solid ${T.rule}`,
		borderRadius: '16px',
		padding: { xs: 2, md: 2.5 }
	};

	const chipSx = (active) => ({
		cursor: 'pointer',
		padding: '4px 10px',
		borderRadius: '999px',
		fontSize: 11,
		fontWeight: 700,
		background: active ? T.acc.hero : T.surf2,
		color: active ? '#fff' : T.ink2,
		border: `1px solid ${active ? T.acc.hero : T.rule}`,
		...sMono
	});

	return (
		<Stack spacing={2}>
			{/* Header — totals by kind + range toggle */}
			<Box sx={panelSx}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={1}>
					<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink }}>
						Family gifts
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 가족 부양·용돈·선물</Box>
					</Typography>
					<Stack direction="row" spacing={0.5}>
						{RANGES.map(r => (
							<Box key={r} onClick={() => setRange(r)} sx={chipSx(range === r)}>{r}</Box>
						))}
					</Stack>
				</Stack>

				<Box sx={{
					display: 'grid',
					gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
					gap: 2,
					marginTop: 2
				}}>
					{KINDS.map(k => (
						<Box key={k.id}>
							<Typography sx={{ fontSize: 10, color: T.ink3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
								{k.label} · {k.ko}
							</Typography>
							<Typography sx={{ ...sDisplay, fontSize: 22, fontWeight: 700, color: k.color, marginTop: 0.5 }}>
								{fmtCurrency(Math.round(totals[k.id]), currency)}
							</Typography>
						</Box>
					))}
					<Box>
						<Typography sx={{ fontSize: 10, color: T.ink3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
							Total · 합계
						</Typography>
						<Typography sx={{ ...sDisplay, fontSize: 22, fontWeight: 700, color: T.ink, marginTop: 0.5 }}>
							{fmtCurrency(Math.round(grandTotal), currency)}
						</Typography>
					</Box>
				</Box>
			</Box>

			{/* Yearly stacked trend */}
			<Box sx={panelSx}>
				<Typography sx={{ ...sDisplay, fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 1.5 }}>
					Yearly trend
					<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 연도별</Box>
				</Typography>
				{yearlyData.length === 0 ? (
					<Typography sx={{ fontSize: 12, color: T.ink3, textAlign: 'center', padding: 3 }}>
						이 기간에 데이터가 없습니다.
					</Typography>
				) : (
					<Box sx={{ width: '100%', height: 280 }}>
						<ResponsiveContainer>
							<BarChart data={yearlyData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" stroke={T.rule} vertical={false}/>
								<XAxis dataKey="year" tick={{ fontSize: 11, fill: T.ink2 }} axisLine={{ stroke: T.rule }} tickLine={false}/>
								<YAxis tick={{ fontSize: 11, fill: T.ink2 }} axisLine={{ stroke: T.rule }} tickLine={false} width={56}
									tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}/>
								<Tooltip
									contentStyle={{ background: T.surf, border: `1px solid ${T.rule}`, borderRadius: 8 }}
									formatter={(v) => fmtCurrency(v, currency)}
								/>
								<Legend wrapperStyle={{ fontSize: 11 }}/>
								<Bar dataKey="support" stackId="a" fill="#ef4444" name="Support"/>
								<Bar dataKey="allowance" stackId="a" fill="#f59e0b" name="Allowance"/>
								<Bar dataKey="gift" stackId="a" fill="#3b82f6" name="Gift"/>
							</BarChart>
						</ResponsiveContainer>
					</Box>
				)}
			</Box>

			{/* By recipient + recent */}
			<Box sx={{
				display: 'grid',
				gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
				gap: 2
			}}>
				<Box sx={panelSx}>
					<Typography sx={{ ...sDisplay, fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 1.5 }}>
						Top recipients
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 대상자별</Box>
					</Typography>
					{byRecipient.length === 0 ? (
						<Typography sx={{ fontSize: 12, color: T.ink3, textAlign: 'center', padding: 2 }}>없음</Typography>
					) : (
						<Stack divider={<Box sx={{ borderTop: `1px solid ${T.rule}` }}/>}>
							{byRecipient.map(r => {
								const k = KIND_BY_ID[r.kind];
								return (
									<Stack key={`${r.recipient}-${r.kind}`} direction="row" alignItems="center" sx={{ padding: '10px 4px' }}>
										<Box sx={{ width: 6, height: 6, borderRadius: '2px', background: k?.color || T.ink3, flexShrink: 0, marginRight: 1 }}/>
										<Box sx={{ flex: 1, minWidth: 0 }}>
											<Typography sx={{ fontSize: 13, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
												{r.recipient}
											</Typography>
											<Typography sx={{ fontSize: 11, color: T.ink3 }}>
												{k?.ko || r.kind} · {r.count}회
											</Typography>
										</Box>
										<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: T.ink }}>
											{fmtCurrency(r.total, currency)}
										</Typography>
									</Stack>
								);
							})}
						</Stack>
					)}
				</Box>

				<Box sx={panelSx}>
					<Typography sx={{ ...sDisplay, fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 1.5 }}>
						Recent
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 최근</Box>
					</Typography>
					{recent.length === 0 ? (
						<Typography sx={{ fontSize: 12, color: T.ink3, textAlign: 'center', padding: 2 }}>없음</Typography>
					) : (
						<Stack divider={<Box sx={{ borderTop: `1px solid ${T.rule}` }}/>}>
							{recent.map(t => {
								const k = KIND_BY_ID[t.giftKind];
								return (
									<Stack key={t._id} direction="row" alignItems="center" sx={{ padding: '10px 4px' }}>
										<Box sx={{ minWidth: 76 }}>
											<Typography sx={{ ...sMono, fontSize: 11, color: T.ink2 }}>{t.date}</Typography>
										</Box>
										<Box sx={{ flex: 1, minWidth: 0 }}>
											<Stack direction="row" alignItems="center" spacing={0.5}>
												<Box sx={{ width: 6, height: 6, borderRadius: '2px', background: k?.color || T.ink3, flexShrink: 0 }}/>
												<Typography sx={{ fontSize: 12, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
													{t.giftTo || '?'}
												</Typography>
											</Stack>
											<Typography sx={{ fontSize: 10, color: T.ink3 }}>
												{k?.label || t.giftKind}{t.memo ? ` · ${t.memo}` : ''}
											</Typography>
										</Box>
										<Typography sx={{ ...sMono, fontSize: 12, fontWeight: 600, color: T.ink }}>
											{fmtCurrency(Math.round(toDisplayAmount(t)), currency)}
										</Typography>
									</Stack>
								);
							})}
						</Stack>
					)}
				</Box>
			</Box>
		</Stack>
	);
}

export default FamilyGifts;
