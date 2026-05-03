import React from 'react';
import PropTypes from 'prop-types';
import stringToColor from 'string-to-color';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import TossIcon from './icons/TossIcon';

import useT from '../hooks/useT';
import useWidth from '../hooks/useWidth';

import {
	sDisplay,
	sMono,
	colorFor,
	fmtCurrencyFull,
	fmtPrice,
	fmtQty
} from '../utils/designTokens';

const Sparkline = ({ data, positive, color }) => {
	if (!data || data.length < 2) return null;
	const prices = data.map(d => d.price);
	const min = Math.min(...prices);
	const max = Math.max(...prices);
	const range = max - min || 1;
	const W = 72, H = 22;
	const points = prices.map((p, i) => {
		const x = (i / (prices.length - 1)) * W;
		const y = H - ((p - min) / range) * H;
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	}).join(' ');
	return (
		<svg width={W} height={H} style={{ display: 'block' }}>
			<polyline
				points={points}
				fill="none"
				stroke={positive ? color.pos : color.neg}
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

Sparkline.propTypes = {
	color: PropTypes.object.isRequired,
	data: PropTypes.array,
	positive: PropTypes.bool
};

const HEADER_LABELS = [
	{ en: 'Account',       ko: '계좌',  align: 'left'  },
	{ en: 'Cost basis',    ko: '매입',  align: 'right' },
	{ en: 'Market value',  ko: '평가',  align: 'right' },
	{ en: 'Realized',      ko: '실현',  align: 'right' },
	{ en: 'Period return', ko: '수익',  align: 'right' },
	{ en: 'Qty',           ko: '수량',  align: 'right' }
];

const GRID_TEMPLATE = '1.4fr 1fr 1fr 1fr 1.1fr 0.7fr';

export function InvestmentPerformance ({
	investment,
	performance,
	symbol,
	price,
	currency,
	weeklyPrices
}) {
	const T = useT();
	const width = useWidth();
	const isSmall = width === 'xs' || width === 'sm';

	const totalQuantity   = performance.reduce((s, l) => s + l.quantity, 0);
	const totalCostBasis  = performance.reduce((s, l) => s + l.costBasis, 0);
	const totalMarketValue = performance.reduce((s, l) => s + l.marketValue, 0);
	const totalRealized   = performance.reduce((s, l) => s + l.periodGain, 0);
	const totalDividend   = performance.reduce((s, l) => s + (l.periodDiv || 0), 0);
	const totalReturn     = performance.reduce((s, l) => s + l.periodReturn, 0);
	const returnPct       = totalCostBasis > 0 ? (totalReturn / totalCostBasis) * 100 : 0;

	const tossSymbol = symbol ? (symbol.split(':')[1] || symbol) : '';
	const handleTossClick = () => {
		if (tossSymbol) window.open(`https://tossinvest.com/stocks/${tossSymbol}`, '_blank', 'noopener,noreferrer');
	};

	// Pre-mixed opaque tint for header / total rows — matches the value used
	// across MonthlyExpenseGrid, AccountInvestments, and Investments Holdings.
	const emphasisBg = T.dark ? '#1f1f28' : '#ededea';
	const dotColor = stringToColor(investment);

	const cardSx = {
		background: T.surf,
		borderRadius: '16px',
		padding: { xs: '16px', md: '20px' },
		border: `1px solid ${T.rule}`,
		color: T.ink
	};

	const headerCellSx = (align) => ({
		padding: '10px 12px',
		fontSize: 11,
		color: T.ink2,
		fontWeight: 600,
		textTransform: 'uppercase',
		letterSpacing: '0.04em',
		textAlign: align,
		borderBottom: `1px solid ${T.rule}`,
		background: emphasisBg
	});

	const cellSx = (align, stripe) => ({
		padding: '10px 12px',
		background: stripe ? T.surf2 : 'transparent',
		fontSize: 13,
		textAlign: align
	});

	const totalCellSx = (align) => ({
		padding: '10px 12px',
		borderTop: `1px solid ${T.rule}`,
		background: emphasisBg,
		fontSize: 13,
		fontWeight: 700,
		textAlign: align
	});

	return (
		<Box sx={cardSx}>
			{/* Header */}
			<Stack
				direction={{ xs: 'column', sm: 'row' }}
				justifyContent="space-between"
				alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
				gap={2}
				sx={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: `1px solid ${T.rule}` }}
			>
				<Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap">
					<Box sx={{
						width: 10,
						height: 10,
						borderRadius: '3px',
						background: dotColor,
						flexShrink: 0
					}}/>
					<Typography
						component="h3"
						sx={{ ...sDisplay, fontSize: 22, fontWeight: 700, color: T.ink, m: 0 }}
					>
						{investment}
					</Typography>
					{currency && (
						<Box sx={{
							fontSize: 10,
							padding: '2px 6px',
							borderRadius: '4px',
							background: T.surf2,
							color: T.ink2,
							fontWeight: 600,
							letterSpacing: '0.04em'
						}}>{currency}</Box>
					)}
					{Number.isFinite(price) && (
						<Box sx={{ ...sMono, fontSize: 13, color: T.ink2 }}>{fmtPrice(price, currency)}</Box>
					)}
					<Sparkline data={weeklyPrices} positive={totalReturn >= 0} color={T} />
					{tossSymbol && (
						<IconButton onClick={handleTossClick} size="small" aria-label="open in toss" sx={{ color: T.ink3 }}>
							<TossIcon sx={{ width: '1.1rem', height: '1.1rem' }} />
						</IconButton>
					)}
					{performance.length > 1 && (
						<Box sx={{ ...sMono, fontSize: 11, color: T.ink3, marginLeft: 0.5 }}>
							· {performance.length} accounts
						</Box>
					)}
				</Stack>
				<Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
					<Box sx={{ ...sDisplay, fontSize: 22, fontWeight: 700, color: colorFor(T, totalReturn) }}>
						{totalReturn >= 0 ? '+' : ''}{fmtCurrencyFull(totalReturn, currency)}
					</Box>
					<Box sx={{ ...sMono, fontSize: 12, color: colorFor(T, returnPct), fontWeight: 600 }}>
						{returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
					</Box>
				</Stack>
			</Stack>

			{isSmall ? (
				<Stack spacing={1}>
					{performance.map((i, idx) => {
						const pct = i.costBasis !== 0 ? (i.periodReturn / i.costBasis) * 100 : 0;
						return (
							<Box
								key={i.account}
								sx={{
									background: idx % 2 === 1 ? T.surf2 : 'transparent',
									border: `1px solid ${T.rule}`,
									borderRadius: '12px',
									padding: '12px'
								}}
							>
								<Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
									<Stack spacing={0.5}>
										<Box sx={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{i.account}</Box>
										<Box sx={{ ...sMono, fontSize: 14, color: T.ink, fontWeight: 600 }}>
											{fmtCurrencyFull(i.marketValue, currency)}
										</Box>
										<Stack direction="row" gap={1.5} sx={{ ...sMono, fontSize: 11, color: T.ink2 }}>
											<Box>매입 {fmtCurrencyFull(i.costBasis, currency)}</Box>
											<Box>· 수량 {fmtQty(i.quantity)}</Box>
										</Stack>
									</Stack>
									<Stack alignItems="flex-end" spacing={0.5}>
										<Box sx={{ ...sMono, fontSize: 13, fontWeight: 700, color: colorFor(T, i.periodReturn) }}>
											{i.periodReturn >= 0 ? '+' : ''}{fmtCurrencyFull(i.periodReturn, currency)}
										</Box>
										<Box sx={{ ...sMono, fontSize: 11, color: colorFor(T, pct), fontWeight: 600 }}>
											{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
										</Box>
										<Box sx={{ ...sMono, fontSize: 10, color: T.ink3 }}>
											실현 {i.periodGain >= 0 ? '+' : ''}{fmtCurrencyFull(i.periodGain, currency)}
										</Box>
									</Stack>
								</Stack>
							</Box>
						);
					})}
					{performance.length > 1 && (
						<Box sx={{
							background: T.surf2,
							border: `1px solid ${T.rule}`,
							borderRadius: '12px',
							padding: '12px'
						}}>
							<Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
								<Stack spacing={0.5}>
									<Box sx={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Total · 합계</Box>
									<Box sx={{ ...sMono, fontSize: 14, color: T.ink, fontWeight: 700 }}>
										{fmtCurrencyFull(totalMarketValue, currency)}
									</Box>
									<Stack direction="row" gap={1.5} sx={{ ...sMono, fontSize: 11, color: T.ink2 }}>
										<Box>매입 {fmtCurrencyFull(totalCostBasis, currency)}</Box>
										<Box>· 수량 {fmtQty(totalQuantity)}</Box>
									</Stack>
								</Stack>
								<Stack alignItems="flex-end" spacing={0.5}>
									<Box sx={{ ...sMono, fontSize: 13, fontWeight: 700, color: colorFor(T, totalReturn) }}>
										{totalReturn >= 0 ? '+' : ''}{fmtCurrencyFull(totalReturn, currency)}
									</Box>
									<Box sx={{ ...sMono, fontSize: 11, color: colorFor(T, returnPct), fontWeight: 600 }}>
										{returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
									</Box>
									<Box sx={{ ...sMono, fontSize: 10, color: T.ink3 }}>
										실현 {totalRealized >= 0 ? '+' : ''}{fmtCurrencyFull(totalRealized, currency)}
										{totalDividend !== 0 && (
											<Box component="span"> · 배당 {fmtCurrencyFull(totalDividend, currency)}</Box>
										)}
									</Box>
								</Stack>
							</Stack>
						</Box>
					)}
				</Stack>
			) : (
				<Box sx={{ display: 'grid', gridTemplateColumns: GRID_TEMPLATE }}>
					{HEADER_LABELS.map((h) => (
						<Box key={h.en} sx={headerCellSx(h.align)}>
							{h.en}
							<Box component="span" sx={{ color: T.ink3, marginLeft: '6px', textTransform: 'none', letterSpacing: 0 }}>· {h.ko}</Box>
						</Box>
					))}

					{performance.map((i, idx) => {
						const stripe = idx % 2 === 1;
						const pct = i.costBasis !== 0 ? (i.periodReturn / i.costBasis) * 100 : 0;
						return (
							<React.Fragment key={i.account}>
								<Box sx={{ ...cellSx('left', stripe), color: T.ink, fontWeight: 500 }}>
									{i.account}
								</Box>
								<Box sx={{ ...cellSx('right', stripe), ...sMono, color: T.ink }}>
									{fmtCurrencyFull(i.costBasis, currency)}
								</Box>
								<Box sx={{ ...cellSx('right', stripe), ...sMono, color: T.ink }}>
									{fmtCurrencyFull(i.marketValue, currency)}
								</Box>
								<Box sx={{ ...cellSx('right', stripe), ...sMono, color: colorFor(T, i.periodGain) }}>
									{i.periodGain >= 0 ? '+' : ''}{fmtCurrencyFull(i.periodGain, currency)}
								</Box>
								<Box sx={{ ...cellSx('right', stripe), ...sMono, color: colorFor(T, i.periodReturn), fontWeight: 700 }}>
									<Box>{i.periodReturn >= 0 ? '+' : ''}{fmtCurrencyFull(i.periodReturn, currency)}</Box>
									<Box sx={{ fontSize: 11, fontWeight: 600 }}>
										{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
									</Box>
								</Box>
								<Box sx={{ ...cellSx('right', stripe), ...sMono, color: T.ink2 }}>
									{fmtQty(i.quantity)}
								</Box>
							</React.Fragment>
						);
					})}

					{performance.length > 1 && (
						<React.Fragment>
							<Box sx={{ ...totalCellSx('left'), color: T.ink }}>Total</Box>
							<Box sx={{ ...totalCellSx('right'), ...sMono, color: T.ink }}>
								{fmtCurrencyFull(totalCostBasis, currency)}
							</Box>
							<Box sx={{ ...totalCellSx('right'), ...sMono, color: T.ink }}>
								{fmtCurrencyFull(totalMarketValue, currency)}
							</Box>
							<Box sx={{ ...totalCellSx('right'), ...sMono, color: colorFor(T, totalRealized) }}>
								{totalRealized >= 0 ? '+' : ''}{fmtCurrencyFull(totalRealized, currency)}
							</Box>
							<Box sx={{ ...totalCellSx('right'), ...sMono, color: colorFor(T, totalReturn) }}>
								<Box>{totalReturn >= 0 ? '+' : ''}{fmtCurrencyFull(totalReturn, currency)}</Box>
								<Box sx={{ fontSize: 11, fontWeight: 600 }}>
									{returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
								</Box>
							</Box>
							<Box sx={{ ...totalCellSx('right'), ...sMono, color: T.ink2 }}>
								{fmtQty(totalQuantity)}
							</Box>
						</React.Fragment>
					)}
				</Box>
			)}
		</Box>
	);
}

InvestmentPerformance.propTypes = {
	investment: PropTypes.string.isRequired,
	performance: PropTypes.array.isRequired,
	currency: PropTypes.string,
	price: PropTypes.number,
	symbol: PropTypes.string,
	weeklyPrices: PropTypes.array
};

export default InvestmentPerformance;
