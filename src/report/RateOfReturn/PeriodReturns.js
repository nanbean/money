import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import useT from '../../hooks/useT';
import { sDisplay, sMono } from '../../utils/designTokens';

// 같은 기준끼리 비교한다: 시간가중(운용 실력)끼리, 금액가중(체감 수익률)끼리.
// XIRR 을 S&P 500(시간가중)과 바로 비교하면 큰돈이 들어간 시기의 성과가 실력처럼 보인다.
const GROUPS = [
	{ label: '시간가중 · 운용 실력', columns: [
		{ key: 'twr', label: '내 수익률' },
		{ key: 'spx', label: 'S&P 500' },
		{ key: 'diff', label: '차이' }
	] },
	{ label: '금액가중 · 체감 수익률 (XIRR)', columns: [
		{ key: 'xirr', label: '내 XIRR' },
		{ key: 'spxXirr', label: 'S&P 500' },
		{ key: 'xirrDiff', label: '차이' }
	] }
];
const COLUMNS = GROUPS.flatMap(g => g.columns);
const gap = (a, b) => (a === null || a === undefined || b === null || b === undefined ? null : a - b);

const fmtPct = (v) => (v === null || v === undefined ? '–' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`);

export function PeriodReturns ({ periods }) {
	const T = useT();
	const colorOf = (v) => (v === null || v === undefined || v === 0 ? T.ink3 : v > 0 ? T.pos : T.neg);
	const rows = periods.map(p => ({
		...p,
		diff: gap(p.twr, p.spx),
		xirrDiff: gap(p.xirr, p.spxXirr)
	}));

	const grid = {
		display: 'grid',
		gridTemplateColumns: `56px repeat(${COLUMNS.length}, minmax(0, 1fr))`,
		columnGap: { xs: 1, md: 2 },
		alignItems: 'center'
	};
	// 두 묶음 사이 구분선: 각 묶음의 첫 열 왼쪽에.
	const groupStart = (key) => GROUPS.slice(1).some(g => g.columns[0].key === key);
	const cellSep = (key) => (groupStart(key) ? { borderLeft: `1px solid ${T.rule}`, paddingLeft: { xs: 1, md: 2 } } : {});

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

			{/* 좁은 화면에서는 표만 가로로 스크롤한다. */}
			<Box sx={{ overflowX: 'auto' }}>
				<Box sx={{ minWidth: 560 }}>
					<Box sx={{ ...grid, paddingBottom: '2px' }}>
						<Box />
						{GROUPS.map((g, i) => (
							<Typography key={g.label} sx={{
								gridColumn: `span ${g.columns.length}`,
								fontSize: 10, color: T.ink3, whiteSpace: 'nowrap', textAlign: 'center',
								borderLeft: i > 0 ? `1px solid ${T.rule}` : 'none'
							}}>
								{g.label}
							</Typography>
						))}
					</Box>
					<Box sx={{ ...grid, paddingBottom: 1, borderBottom: `1px solid ${T.rule}` }}>
						<Box />
						{COLUMNS.map(c => (
							<Typography key={c.key} sx={{ fontSize: 12, fontWeight: 600, color: T.ink2, whiteSpace: 'nowrap', textAlign: 'right', ...cellSep(c.key) }}>
								{c.label}
							</Typography>
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
								<Typography key={c.key} sx={{ ...sMono, fontSize: { xs: 12, md: 13 }, textAlign: 'right', color: colorOf(r[c.key]), whiteSpace: 'nowrap', ...cellSep(c.key) }}>
									{fmtPct(r[c.key])}
								</Typography>
							))}
						</Box>
					))}
				</Box>
			</Box>

			<Typography sx={{ fontSize: 11, color: T.ink3, marginTop: 1.5, lineHeight: 1.6 }}>
				완결된 연도 기준 연환산이며, YTD 는 올해 누적(연환산 아님)입니다. 같은 묶음끼리 비교하세요 — 금액가중의
				S&amp;P 500 은 같은 날 같은 금액을 SPY 에 넣고 뺐다면의 XIRR 입니다. S&amp;P 500 은 SPY 종가 기준이라 배당이
				빠져 있어 실제 총수익보다 연 1~2%p 낮게 나옵니다. 데이터가 기간보다 짧으면 –로 표시합니다.
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
		xirr: PropTypes.number,
		spxXirr: PropTypes.number
	})).isRequired
};

export default PeriodReturns;
