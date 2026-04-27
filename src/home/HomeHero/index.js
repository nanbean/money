import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';

import useT from '../../hooks/useT';
import { sDisplay, sMono, fmtCurrency, colorFor } from '../../utils/designTokens';
import {
	calcSavingsScore,
	calcInvestmentScore,
	calcEmergencyScore,
	calcDebtScore,
	toDisplay
} from '../FinancialHealthScore/utils';
import { getNetWorthFlowAction } from '../../actions/couchdbReportActions';
import { updateInvestmentPriceAction } from '../../actions/priceActions';

const groupBalance = (accountList, predicate, exchangeRate, currency) => accountList
	.filter(a => !a.closed && !a.name.match(/_Cash/i) && predicate(a))
	.reduce((sum, a) => sum + toDisplay(a, exchangeRate, currency), 0);

function Stat ({ label, value, delta, deltaColor, T, divider }) {
	return (
		<Box sx={{
			borderLeft: divider ? `1px solid ${T.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)'}` : 'none',
			paddingLeft: divider ? '24px' : 0,
			minWidth: 0
		}}>
			<Typography sx={{
				fontSize: 11,
				color: T.dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)',
				textTransform: 'uppercase',
				letterSpacing: '0.08em',
				fontWeight: 500
			}}>
				{label}
			</Typography>
			<Typography sx={{
				...sDisplay,
				fontSize: { xs: 18, md: 24 },
				fontWeight: 600,
				color: '#fff',
				marginTop: '8px',
				whiteSpace: 'nowrap',
				overflow: 'hidden',
				textOverflow: 'ellipsis'
			}}>
				{value}
			</Typography>
			{delta && (
				<Typography sx={{ fontSize: 11, color: deltaColor, marginTop: '4px', fontWeight: 500 }}>
					{delta}
				</Typography>
			)}
		</Box>
	);
}

const grade = (score) => {
	if (score >= 85) return '최우수';
	if (score >= 70) return '좋음';
	if (score >= 50) return '보통';
	if (score >= 30) return '주의';
	return '위험';
};

export default function HomeHero () {
	const dispatch = useDispatch();
	const T = useT();

	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const netWorthFlow = useSelector((state) => state.netWorthFlow);
	const username = useSelector((state) => state.username);
	const { exchangeRate, currency = 'KRW', livingExpenseExempt = [] } = useSelector((state) => state.settings || {});

	useEffect(() => {
		if (!netWorthFlow || netWorthFlow.length === 0) {
			dispatch(getNetWorthFlowAction());
		}
	}, [dispatch, netWorthFlow]);

	const breakdown = useMemo(() => {
		if (!accountList || accountList.length === 0) {
			return { netWorth: 0, liquid: 0, invest: 0, realEstate: 0, liabilities: 0 };
		}
		const liquid = groupBalance(
			accountList,
			a => a.type === 'Bank' || a.type === 'Cash' || a.type === 'CCard',
			exchangeRate,
			currency
		);
		const invest = groupBalance(accountList, a => a.type === 'Invst', exchangeRate, currency);
		const realEstate = groupBalance(accountList, a => a.type === 'Oth A', exchangeRate, currency);
		const liabilities = groupBalance(accountList, a => a.type === 'Oth L', exchangeRate, currency);
		const netWorth = liquid + invest + realEstate + liabilities;
		return { netWorth, liquid, invest, realEstate, liabilities };
	}, [accountList, exchangeRate, currency]);

	const monthDelta = useMemo(() => {
		if (!netWorthFlow || netWorthFlow.length < 2) return null;
		const latest = netWorthFlow[netWorthFlow.length - 1];
		const prev = netWorthFlow[netWorthFlow.length - 2];
		if (!latest || !prev || !latest.netWorth) return null;
		const conv = (n) => currency === 'USD' ? n / exchangeRate : n;
		const diff = conv(latest.netWorth) - conv(prev.netWorth);
		const pct = prev.netWorth ? (diff / Math.abs(prev.netWorth)) * 100 : 0;
		return { diff, pct };
	}, [netWorthFlow, currency, exchangeRate]);

	const score = useMemo(() => {
		if (!accountList || accountList.length === 0) return 0;
		return (
			calcSavingsScore(allAccountsTransactions || [], livingExpenseExempt) +
			calcInvestmentScore(accountList, exchangeRate, currency) +
			calcEmergencyScore(accountList, allAccountsTransactions || [], exchangeRate, currency) +
			calcDebtScore(accountList, exchangeRate, currency)
		);
	}, [accountList, allAccountsTransactions, livingExpenseExempt, exchangeRate, currency]);

	const onRefresh = () => username && dispatch(updateInvestmentPriceAction());

	const heroBg = T.dark
		? 'linear-gradient(135deg, #15151c 0%, #1d1d26 100%)'
		: `linear-gradient(135deg, ${T.acc.hero} 0%, ${T.acc.deep} 100%)`;
	const heroInk = '#ffffff';
	const heroDim = T.dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)';

	return (
		<Box sx={{
			position: 'relative',
			overflow: 'hidden',
			background: heroBg,
			borderRadius: { xs: '16px', md: '24px' },
			padding: { xs: '24px', md: '40px' },
			color: heroInk,
			marginBottom: '20px'
		}}>
			<Box sx={{
				position: 'absolute',
				top: -100,
				right: -100,
				width: 400,
				height: 400,
				borderRadius: '50%',
				background: `radial-gradient(circle, ${T.acc.bright}55 0%, transparent 70%)`,
				pointerEvents: 'none'
			}}/>

			<Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-start' }} spacing={2} sx={{ position: 'relative' }}>
				<Box sx={{ minWidth: 0 }}>
					<Typography sx={{
						fontSize: 12,
						color: heroDim,
						textTransform: 'uppercase',
						letterSpacing: '0.08em',
						fontWeight: 500
					}}>
						Net worth · 순자산
					</Typography>
					<Typography sx={{
						...sDisplay,
						fontSize: { xs: 40, sm: 56, md: 72 },
						fontWeight: 700,
						lineHeight: 1,
						marginTop: '14px',
						color: heroInk
					}}>
						{fmtCurrency(breakdown.netWorth, currency)}
					</Typography>
					<Stack direction="row" alignItems="center" spacing={1.5} sx={{ marginTop: '14px', flexWrap: 'wrap', rowGap: 1 }}>
						{monthDelta && (
							<>
								<Box sx={{
									color: monthDelta.diff >= 0 ? T.pos : T.neg,
									background: monthDelta.diff >= 0 ? T.posBg : T.negBg,
									padding: '4px 10px',
									borderRadius: '999px',
									fontWeight: 600,
									fontSize: 13,
									...sMono
								}}>
									{monthDelta.diff >= 0 ? '+' : ''}{monthDelta.pct.toFixed(2)}%
								</Box>
								<Typography sx={{ ...sMono, color: heroDim, fontSize: 13 }}>
									{monthDelta.diff >= 0 ? '+' : '−'}
									{fmtCurrency(Math.abs(monthDelta.diff), currency)} past month
								</Typography>
							</>
						)}
						{score > 0 && (
							<Box sx={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 1,
								background: 'rgba(255,255,255,0.1)',
								border: '1px solid rgba(255,255,255,0.18)',
								padding: '4px 12px 4px 8px',
								borderRadius: '999px',
								fontSize: 12
							}}>
								<Box sx={{
									width: 22,
									height: 22,
									borderRadius: '11px',
									background: T.pos,
									color: '#0a0a0e',
									fontWeight: 800,
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: 11,
									...sDisplay
								}}>
									{score}
								</Box>
								<FavoriteBorderOutlinedIcon sx={{ fontSize: 14, color: heroInk, opacity: 0.85 }} />
								<Typography sx={{ color: heroInk, fontSize: 12, fontWeight: 600 }}>
									Financial health
								</Typography>
								<Typography sx={{ color: heroDim, fontSize: 11 }}>· {grade(score)}</Typography>
							</Box>
						)}
					</Stack>
				</Box>

				<Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
					<Button
						onClick={onRefresh}
						disabled={!username}
						startIcon={<RefreshOutlinedIcon />}
						sx={{
							background: T.acc.bright,
							color: T.acc.deep,
							border: 'none',
							borderRadius: '999px',
							padding: '8px 18px',
							fontSize: 13,
							fontWeight: 700,
							textTransform: 'none',
							'&:hover': { background: T.acc.bright, opacity: 0.9 },
							'&.Mui-disabled': { background: 'rgba(255,255,255,0.12)', color: heroDim }
						}}
					>
						Refresh prices
					</Button>
				</Stack>
			</Stack>

			<Box sx={{
				display: 'grid',
				gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
				gap: { xs: 2, md: 3 },
				marginTop: { xs: '24px', md: '32px' },
				position: 'relative'
			}}>
				<Stat
					label="Liquid · 유동자산"
					value={fmtCurrency(breakdown.liquid, currency)}
					T={T}
				/>
				<Stat
					label="Investments · 투자"
					value={fmtCurrency(breakdown.invest, currency)}
					T={T}
					divider
				/>
				<Stat
					label="Real estate · 부동산"
					value={fmtCurrency(breakdown.realEstate, currency)}
					T={T}
					divider
				/>
				<Stat
					label="Liabilities · 부채"
					value={fmtCurrency(breakdown.liabilities, currency)}
					deltaColor={colorFor(T, breakdown.liabilities)}
					T={T}
					divider
				/>
			</Box>
		</Box>
	);
}
