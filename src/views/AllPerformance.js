import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import DesignPage from '../components/DesignPage';
import InvestmentPerformance from '../components/InvestmentPerformance';

import useT from '../hooks/useT';
import { setfilteredInvestments } from '../actions/investmentActions';
import { getInvestmentPerformance } from '../utils/performance';

import {
	sDisplay,
	sMono,
	labelStyle,
	colorFor,
	fmtKRW
} from '../utils/designTokens';

export function AllPerformance ({ embedded = false }) {
	const dispatch = useDispatch();
	const T = useT();
	const lab = labelStyle(T);

	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const allInvestmentsPrice = useSelector((state) => state.allInvestmentsPrice);
	const filteredInvestments = useSelector((state) => state.filteredInvestments);
	const { exchangeRate } = useSelector((state) => state.settings);

	const allInvestmentsTransactions = useMemo(
		() => allAccountsTransactions.filter(i => i.accountId && i.accountId.startsWith('account:Invst')),
		[allAccountsTransactions]
	);

	const tradedPrices = useMemo(
		() => allInvestmentsPrice.filter(i => allInvestmentsTransactions.find(j => j.investment === i.name)),
		[allInvestmentsPrice, allInvestmentsTransactions]
	);

	const allPerformance = useMemo(() => {
		if (allInvestmentsTransactions.length === 0 || allInvestmentsPrice.length === 0) return [];
		return tradedPrices.map(i => {
			const txs = allInvestmentsTransactions.filter(j => j.investment === i.name);
			const performance = getInvestmentPerformance(txs, i.price);
			return {
				investment: i.name,
				price: i.price,
				currency: i.currency,
				symbol: i.googleSymbol,
				performance,
				weeklyPrices: i.weeklyPrices
			};
		});
	}, [tradedPrices, allInvestmentsTransactions, allInvestmentsPrice]);

	if (allPerformance.length === 0) {
		if (embedded) {
			return null;
		}
		return <DesignPage title="Performance" titleKo="종목별 수익률" loading />;
	}

	const fx = (n, currency) => (currency === 'USD' ? n * exchangeRate : n);

	const filteredSet = new Set(filteredInvestments);
	const allTickers = tradedPrices.map(p => p.name);

	const rows = allPerformance
		.filter(p => filteredSet.has(p.investment))
		.map(p => {
			const totalCost = p.performance.reduce((s, a) => s + a.costBasis, 0);
			const totalValue = p.performance.reduce((s, a) => s + a.marketValue, 0);
			const totalRealized = p.performance.reduce((s, a) => s + a.periodGain, 0);
			const totalReturn = p.performance.reduce((s, a) => s + a.periodReturn, 0);
			return { ...p, totalCost, totalValue, totalRealized, totalReturn };
		})
		.sort((a, b) => fx(b.totalValue, b.currency) - fx(a.totalValue, a.currency));

	const grandCost     = rows.reduce((s, r) => s + fx(r.totalCost, r.currency), 0);
	const grandValue    = rows.reduce((s, r) => s + fx(r.totalValue, r.currency), 0);
	const grandRealized = rows.reduce((s, r) => s + fx(r.totalRealized, r.currency), 0);
	const grandReturn   = rows.reduce((s, r) => s + fx(r.totalReturn, r.currency), 0);
	const grandUnreal   = grandReturn - grandRealized;
	const grandPct      = grandCost > 0 ? (grandReturn / grandCost) * 100 : 0;

	const toggle = (name) => {
		if (filteredSet.has(name)) {
			dispatch(setfilteredInvestments(filteredInvestments.filter(n => n !== name)));
		} else {
			dispatch(setfilteredInvestments([...filteredInvestments, name]));
		}
	};
	const setAll = (on) => dispatch(setfilteredInvestments(on ? [...allTickers] : []));

	const cardSx = {
		background: T.surf,
		borderRadius: '16px',
		padding: { xs: '18px', md: '26px' },
		border: `1px solid ${T.rule}`,
		color: T.ink
	};

	const content = (
		<React.Fragment>
			{/* HERO — 5 cell grand totals */}
			<Box sx={{
				...cardSx,
				background: T.acc.tint,
				borderColor: 'transparent',
				padding: { xs: '20px', md: '32px' },
				marginBottom: '20px'
			}}>
				<Box sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr 1fr', md: '1.4fr 1fr 1fr 1fr 1fr' },
					gap: { xs: '20px', md: '28px' },
					alignItems: 'flex-start'
				}}>
					<Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
						<Box sx={lab}>Grand total return · 총 수익</Box>
						<Box sx={{
							...sDisplay,
							...sMono,
							fontSize: { xs: 36, md: 44 },
							fontWeight: 700,
							marginTop: '6px',
							color: colorFor(T, grandReturn)
						}}>
							{grandReturn >= 0 ? '+' : ''}{fmtKRW(grandReturn)}
						</Box>
						<Box sx={{ fontSize: 13, color: colorFor(T, grandReturn), fontWeight: 600, marginTop: '4px' }}>
							{grandPct >= 0 ? '↑' : '↓'} {Math.abs(grandPct).toFixed(2)}% on cost · {filteredInvestments.length} of {allTickers.length} selected
						</Box>
					</Box>
					<Box>
						<Box sx={lab}>Cost basis · 매입원가</Box>
						<Box sx={{ ...sDisplay, ...sMono, fontSize: 22, fontWeight: 700, marginTop: '6px' }}>{fmtKRW(grandCost)}</Box>
						<Box sx={{ fontSize: 11, color: T.ink2, marginTop: '2px' }}>at avg cost · 평균단가</Box>
					</Box>
					<Box>
						<Box sx={lab}>Market value · 평가금액</Box>
						<Box sx={{ ...sDisplay, ...sMono, fontSize: 22, fontWeight: 700, marginTop: '6px' }}>{fmtKRW(grandValue)}</Box>
						<Box sx={{ fontSize: 11, color: T.ink2, marginTop: '2px' }}>today · 오늘</Box>
					</Box>
					<Box>
						<Box sx={lab}>Realized · 실현손익</Box>
						<Box sx={{
							...sDisplay,
							...sMono,
							fontSize: 22,
							fontWeight: 700,
							marginTop: '6px',
							color: colorFor(T, grandRealized)
						}}>
							{grandRealized >= 0 ? '+' : ''}{fmtKRW(grandRealized)}
						</Box>
						<Box sx={{ fontSize: 11, color: T.ink2, marginTop: '2px' }}>incl. dividends, fees · 배당·수수료 포함</Box>
					</Box>
					<Box>
						<Box sx={lab}>Unrealized · 미실현</Box>
						<Box sx={{
							...sDisplay,
							...sMono,
							fontSize: 22,
							fontWeight: 700,
							marginTop: '6px',
							color: colorFor(T, grandUnreal)
						}}>
							{grandUnreal >= 0 ? '+' : ''}{fmtKRW(grandUnreal)}
						</Box>
						<Box sx={{ fontSize: 11, color: T.ink2, marginTop: '2px' }}>open positions · 보유</Box>
					</Box>
				</Box>
			</Box>

			{/* FILTER chips */}
			<Box sx={{ ...cardSx, marginBottom: '20px' }}>
				<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ marginBottom: '14px', gap: '12px' }}>
					<Typography
						component="h3"
						sx={{ ...sDisplay, fontSize: 18, fontWeight: 700, margin: 0, color: T.ink }}
					>
						Filter investments
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 13, marginLeft: '8px' }}>
							· 종목 선택
						</Box>
					</Typography>
					<Stack direction="row" alignItems="baseline" gap={1}>
						<Box
							component="button"
							type="button"
							onClick={() => setAll(true)}
							sx={{
								background: 'transparent',
								border: 'none',
								color: T.acc.bright,
								fontFamily: 'inherit',
								fontSize: 12,
								fontWeight: 600,
								cursor: 'pointer',
								padding: 0
							}}
						>
							All
						</Box>
						<Box component="span" sx={{ color: T.rule }}>·</Box>
						<Box
							component="button"
							type="button"
							onClick={() => setAll(false)}
							sx={{
								background: 'transparent',
								border: 'none',
								color: T.ink2,
								fontFamily: 'inherit',
								fontSize: 12,
								fontWeight: 600,
								cursor: 'pointer',
								padding: 0
							}}
						>
							None
						</Box>
					</Stack>
				</Stack>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
					{tradedPrices.map(inv => {
						const on = filteredSet.has(inv.name);
						const matched = allPerformance.find(p => p.investment === inv.name);
						const value = matched
							? matched.performance.reduce((s, a) => s + a.marketValue, 0)
							: 0;
						const valueKRW = inv.currency === 'USD' ? value * exchangeRate : value;
						return (
							<Box
								key={inv.name}
								component="button"
								type="button"
								onClick={() => toggle(inv.name)}
								sx={{
									display: 'inline-flex',
									alignItems: 'center',
									gap: '8px',
									padding: '8px 12px',
									border: `1px solid ${on ? T.acc.bright : T.rule}`,
									borderRadius: '999px',
									background: on ? T.acc.tint : 'transparent',
									cursor: 'pointer',
									color: on ? T.ink : T.ink2,
									fontFamily: 'inherit',
									transition: 'all 0.15s'
								}}
							>
								<Box sx={{
									width: '14px',
									height: '14px',
									borderRadius: '3px',
									border: `1.5px solid ${on ? T.acc.bright : T.ink3}`,
									background: on ? T.acc.bright : 'transparent',
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: '#fff',
									fontSize: '9px',
									fontWeight: 800,
									lineHeight: 1
								}}>
									{on ? '✓' : ''}
								</Box>
								<Box sx={{ fontSize: 12, fontWeight: 600 }}>{inv.name}</Box>
								{inv.currency && (
									<Box sx={{ ...sMono, fontSize: 10, color: T.ink3, fontWeight: 500 }}>
										{inv.currency}
									</Box>
								)}
								<Box sx={{ ...sMono, fontSize: 11, color: T.ink3, fontWeight: 500 }}>
									· {fmtKRW(valueKRW)}
								</Box>
							</Box>
						);
					})}
				</Box>
			</Box>

			{rows.length === 0 && (
				<Box sx={{ ...cardSx, textAlign: 'center', color: T.ink2, padding: '40px' }}>
					No investments selected · 선택된 종목이 없습니다
				</Box>
			)}

			<Stack spacing={2.5}>
				{rows.map(r => (
					<InvestmentPerformance
						key={r.investment}
						investment={r.investment}
						price={r.price}
						currency={r.currency}
						performance={r.performance}
						symbol={r.symbol}
						weeklyPrices={r.weeklyPrices}
					/>
				))}
			</Stack>
		</React.Fragment>
	);

	if (embedded) {
		return content;
	}

	return (
		<DesignPage title="Performance" titleKo="종목별 수익률">
			{content}
		</DesignPage>
	);
}

AllPerformance.propTypes = {
	embedded: PropTypes.bool
};

export default AllPerformance;
