import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import useT from '../../hooks/useT';
import { sDisplay, sMono } from '../../utils/designTokens';

const COLUMNS = [
	{ key: 'twr', label: '내 수익률', sub: '시간가중' },
	{ key: 'spx', label: 'S&P 500', sub: 'SPY 가격' },
	{ key: 'diff', label: '차이', sub: '내 − S&P' },
	{ key: 'xirr', label: 'XIRR', sub: '금액가중' }
];

const fmtPct = (v) => (v === null || v === undefined ? '–' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`);

export function PeriodReturns ({ periods }) {
	const T = useT();
	const colorOf = (v) => (v === null || v === undefined || v === 0 ? T.ink3 : v > 0 ? T.pos : T.neg);
	const rows = periods.map(p => ({
		...p,
		diff: p.twr !== null && p.spx !== null && p.twr !== undefined && p.spx !== undefined ? p.twr - p.spx : null
	}));

	const grid = {
		display: 'grid',
		gridTemplateColumns: '64px repeat(4, minmax(0, 1fr))',
		columnGap: { xs: 1, md: 2 },
		alignItems: 'center'
	};

	return (
		<Box sx={{
			background: T.surf,
			border: `1px solid ${T.rule}`,
			borderRadius: '16px',
			padding: { xs: '14px', md: '18px' },
			color: T.ink
		}}>
			<Typography sx={{ ...sDisplay, fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 1.5 }}>
				Period returns
				<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 기간별 연환산 수익률</Box>
			</Typography>

			<Box sx={{ ...grid, paddingBottom: 1, borderBottom: `1px solid ${T.rule}` }}>
				<Box />
				{COLUMNS.map(c => (
					<Box key={c.key} sx={{ textAlign: 'right', minWidth: 0 }}>
						<Typography sx={{ fontSize: 12, fontWeight: 600, color: T.ink2, whiteSpace: 'nowrap' }}>{c.label}</Typography>
						<Typography sx={{ fontSize: 10, color: T.ink3, whiteSpace: 'nowrap' }}>{c.sub}</Typography>
					</Box>
				))}
			</Box>

			{rows.map(r => (
				<Box key={r.key} sx={{ ...grid, paddingY: '7px', borderBottom: r.key === 'ytd' ? `1px dashed ${T.rule}` : 'none' }}>
					<Typography sx={{ fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap' }}>
						{r.label}
						{r.key === 'all' && r.span ? (
							<Box component="span" sx={{ fontSize: 10, fontWeight: 400, color: T.ink3, marginLeft: '4px' }}>{r.span}y</Box>
						) : null}
					</Typography>
					{COLUMNS.map(c => (
						<Typography key={c.key} sx={{ ...sMono, fontSize: { xs: 12, md: 13 }, textAlign: 'right', color: colorOf(r[c.key]), whiteSpace: 'nowrap' }}>
							{fmtPct(r[c.key])}
						</Typography>
					))}
				</Box>
			))}

			<Typography sx={{ fontSize: 11, color: T.ink3, marginTop: 1.5, lineHeight: 1.6 }}>
				완결된 연도 기준 연환산이며, YTD 는 올해 누적(연환산 아님)입니다. S&amp;P 500 은 SPY 종가 기준이라 배당이 빠져 있어
				실제 총수익보다 연 1~2%p 낮게 나옵니다. XIRR 은 입출금 시점과 금액까지 반영한 체감 수익률입니다.
				데이터가 기간보다 짧으면 –로 표시합니다.
			</Typography>
		</Box>
	);
}

PeriodReturns.propTypes = {
	periods: PropTypes.arrayOf(PropTypes.shape({
		key: PropTypes.string.isRequired,
		label: PropTypes.string.isRequired,
		span: PropTypes.number,
		twr: PropTypes.number,
		spx: PropTypes.number,
		xirr: PropTypes.number
	})).isRequired
};

export default PeriodReturns;
