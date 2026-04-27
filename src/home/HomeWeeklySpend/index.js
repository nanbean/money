import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import useT from '../../hooks/useT';
import { sDisplay, sMono, labelStyle, fmtCurrency } from '../../utils/designTokens';

const PALETTE = ['#818cf8', '#f59e0b', '#34d399', '#f472b6', '#22d3ee', '#a78bfa', '#fb7185', '#facc15'];

const isInternalTransfer = (t) => /^\[.*\]$/.test(t.category || '');

function Donut ({ data, total, T, currency }) {
	const r = 64;
	const ri = 44;
	const sz = 140;
	const cx = sz / 2;
	const cy = sz / 2;
	let acc = 0;
	const paths = data.map(({ value, color }, idx) => {
		if (total <= 0) return null;
		const start = acc / total * Math.PI * 2 - Math.PI / 2;
		acc += value;
		const end = acc / total * Math.PI * 2 - Math.PI / 2;
		const lg = end - start > Math.PI ? 1 : 0;
		const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
		const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
		const xi1 = cx + ri * Math.cos(start), yi1 = cy + ri * Math.sin(start);
		const xi2 = cx + ri * Math.cos(end),   yi2 = cy + ri * Math.sin(end);
		return <path key={idx} d={`M${x1},${y1} A${r},${r} 0 ${lg} 1 ${x2},${y2} L${xi2},${yi2} A${ri},${ri} 0 ${lg} 0 ${xi1},${yi1} Z`} fill={color}/>;
	});
	return (
		<svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
			{total > 0 ? paths : <circle cx={cx} cy={cy} r={(r + ri) / 2} fill="none" stroke={T.rule} strokeWidth={r - ri}/>}
			<text x={cx} y={cy - 2} textAnchor="middle" fontSize="10" fill={T.ink2}>This week</text>
			<text x={cx} y={cy + 16} textAnchor="middle" fontSize="14" fontWeight="700" fill={T.ink} style={{ ...sDisplay }}>
				{total > 0 ? fmtCurrency(total, currency) : '—'}
			</text>
		</svg>
	);
}

export default function HomeWeeklySpend () {
	const T = useT();
	const lab = labelStyle(T);

	const accountList = useSelector((state) => state.accountList);
	const weeklyTransactions = useSelector((state) => state.weeklyTransactions || []);
	const { exchangeRate, currency = 'KRW', livingExpenseExempt = [] } = useSelector((state) => state.settings || {});

	const { rows, total } = useMemo(() => {
		const accountMap = new Map((accountList || []).map(a => [a._id, a]));
		const conv = (t) => {
			const acc = accountMap.get(t.accountId);
			const txCur = acc?.currency || 'KRW';
			const abs = Math.abs(t.amount);
			if (txCur === currency) return abs;
			return currency === 'KRW' ? abs * exchangeRate : abs / exchangeRate;
		};
		const weekStart = moment().startOf('isoWeek').format('YYYY-MM-DD');
		const expenseTxns = (weeklyTransactions || []).filter(t =>
			t.date >= weekStart &&
			t.amount < 0 &&
			!isInternalTransfer(t) &&
			!livingExpenseExempt.some(e => t.category?.startsWith(e))
		);
		const grouped = expenseTxns.reduce((map, t) => {
			const key = (t.category || 'Other').split(':')[0];
			map.set(key, (map.get(key) || 0) + conv(t));
			return map;
		}, new Map());
		const sorted = [...grouped.entries()].sort((a, b) => b[1] - a[1]);
		const tot = sorted.reduce((s, [, v]) => s + v, 0);
		const top = sorted.slice(0, 5).map(([name, value], i) => ({
			name, value, color: PALETTE[i % PALETTE.length]
		}));
		return { rows: top, total: tot };
	}, [weeklyTransactions, accountList, exchangeRate, currency, livingExpenseExempt]);

	return (
		<Box sx={{
			background: T.surf,
			border: `1px solid ${T.rule}`,
			borderRadius: '16px',
			padding: { xs: '16px', md: '20px' },
			color: T.ink,
			minHeight: 180
		}}>
			<Typography sx={lab}>Where it went · this week</Typography>
			<Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1.75 }}>
				<Donut data={rows} total={total} T={T} currency={currency}/>
				<Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
					{rows.length === 0 && (
						<Typography sx={{ fontSize: 12, color: T.ink2 }}>No spending this week</Typography>
					)}
					{rows.map((r) => (
						<Stack key={r.name} direction="row" alignItems="center" spacing={1} sx={{ fontSize: 12 }}>
							<Box sx={{ width: 8, height: 8, borderRadius: '4px', background: r.color, flexShrink: 0 }}/>
							<Typography sx={{ fontSize: 12, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</Typography>
							<Typography sx={{ ...sMono, fontSize: 11, color: T.ink2 }}>
								{total > 0 ? `${Math.round(r.value / total * 100)}%` : '—'}
							</Typography>
						</Stack>
					))}
				</Stack>
			</Stack>
		</Box>
	);
}
