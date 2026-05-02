import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import stringToColor from 'string-to-color';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import Amount from './Amount';
import Quantity from './Quantity';
import useT from '../hooks/useT';
import useWidth from '../hooks/useWidth';
import { sMono } from '../utils/designTokens';
import { getAccountPerformance } from '../utils/performance';

const COLS_FULL = '1.6fr 130px 130px 110px';   // name | market | gain | return%
const COLS_MOBILE = '1fr auto';                // name | stacked numbers

export function AccountInvestments ({ currency }) {
	const T = useT();
	const width = useWidth();
	const isSmallScreen = width === 'xs' || width === 'sm';

	const account = useSelector((state) => state.account);
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const allInvestmentsPrice = useSelector((state) => state.allInvestmentsPrice);
	const accountInvestments = useSelector((state) => state.accountInvestments);

	const performance = useMemo(() => {
		const allInvst = allAccountsTransactions.filter(i => i.accountId && i.accountId.startsWith('account:Invst'));
		return getAccountPerformance(account, accountInvestments, allInvst, allInvestmentsPrice);
	}, [account, accountInvestments, allAccountsTransactions, allInvestmentsPrice]);

	const totals = useMemo(() => {
		const filtered = performance.filter(j => j.name);
		if (filtered.length === 0) {
			return { costBasis: 0, marketValue: 0, periodGain: 0, periodReturn: 0 };
		}
		return {
			costBasis: filtered.reduce((s, i) => s + i.costBasis, 0),
			marketValue: filtered.reduce((s, i) => s + i.marketValue, 0),
			periodGain: filtered.reduce((s, i) => s + i.periodGain, 0),
			periodReturn: filtered.reduce((s, i) => s + i.periodReturn, 0)
		};
	}, [performance]);

	const totalBalance = (accountList.find(i => i.name === account) || {}).balance ?? 0;
	const cash = totalBalance - totals.marketValue;

	const headerSx = {
		display: 'grid',
		gridTemplateColumns: isSmallScreen ? COLS_MOBILE : COLS_FULL,
		gap: '10px',
		padding: '6px 12px',
		fontSize: 11,
		color: T.ink2,
		fontWeight: 600,
		textTransform: 'uppercase',
		letterSpacing: '0.06em',
		borderBottom: `1px solid ${T.rule}`
	};

	const rowSx = {
		display: 'grid',
		gridTemplateColumns: isSmallScreen ? COLS_MOBILE : COLS_FULL,
		gap: '10px',
		padding: '10px 12px',
		alignItems: 'center',
		borderBottom: `1px solid ${T.rule}`
	};

	const labelSx = { textAlign: 'right' };

	const rows = performance.filter(j => j.name);

	return (
		<Box sx={{
			border: `1px solid ${T.rule}`,
			borderRadius: '12px',
			overflow: 'hidden',
			background: T.surf
		}}>
			{/* header */}
			<Box sx={headerSx}>
				<Box>Investment</Box>
				{!isSmallScreen ? (
					<>
						<Box sx={labelSx}>Market value</Box>
						<Box sx={labelSx}>Gain/Loss</Box>
						<Box sx={labelSx}>Return</Box>
					</>
				) : (
					<Box sx={labelSx}>Value · Gain</Box>
				)}
			</Box>

			{/* holdings rows */}
			{rows.map(i => {
				const portPct = totals.marketValue ? (i.marketValue / totals.marketValue) * 100 : 0;
				const dotColor = stringToColor(i.name);
				const returnPct = i.costBasis !== 0 ? (i.periodReturn / i.costBasis) * 100 : 0;
				const returnColor = i.periodReturn > 0 ? T.pos : i.periodReturn < 0 ? T.neg : T.ink2;

				return (
					<Box key={i.name} sx={rowSx}>
						{/* name + meta */}
						<Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
							<Box sx={{ width: 8, height: 8, borderRadius: '2px', background: dotColor, flexShrink: 0 }} />
							<Stack sx={{ minWidth: 0 }}>
								<Stack direction="row" alignItems="baseline" spacing={0.75}>
									<Typography sx={{ fontSize: 13, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{i.name}
									</Typography>
									<Typography sx={{ ...sMono, fontSize: 11, color: T.ink3, flexShrink: 0 }}>
										{portPct.toFixed(1)}%
									</Typography>
								</Stack>
								<Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ marginTop: '2px' }}>
									<Typography sx={{ ...sMono, fontSize: 11, color: T.ink2 }}>
										<Amount value={i.price} currency={currency} showSymbol showOriginal />
									</Typography>
									<Typography sx={{ fontSize: 11, color: T.ink3 }}>×</Typography>
									<Typography sx={{ ...sMono, fontSize: 11, color: T.ink2 }}>
										<Quantity value={i.quantity} />
									</Typography>
								</Stack>
							</Stack>
						</Stack>

						{/* numbers */}
						{!isSmallScreen ? (
							<>
								<Stack sx={{ textAlign: 'right' }}>
									<Box sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: T.ink }}>
										<Amount value={i.marketValue} currency={currency} showSymbol />
									</Box>
									<Typography sx={{ ...sMono, fontSize: 11, color: T.ink3, marginTop: '2px' }}>
										cost <Amount value={i.costBasis} currency={currency} showSymbol />
									</Typography>
								</Stack>
								<Box sx={{ ...sMono, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
									<Amount value={i.periodGain} currency={currency} showSymbol negativeColor />
								</Box>
								<Box sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: returnColor, textAlign: 'right' }}>
									{returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
								</Box>
							</>
						) : (
							<Stack sx={{ textAlign: 'right', minWidth: 110 }}>
								<Box sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: T.ink }}>
									<Amount value={i.marketValue} currency={currency} showSymbol />
								</Box>
								<Typography sx={{ ...sMono, fontSize: 11, color: returnColor, marginTop: '2px' }}>
									<Amount value={i.periodGain} currency={currency} showSymbol negativeColor />
									{' '}({returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%)
								</Typography>
							</Stack>
						)}
					</Box>
				);
			})}

			{/* cash row */}
			<Box sx={{ ...rowSx, background: T.surf2 }}>
				<Stack direction="row" alignItems="center" spacing={1.25}>
					<Box sx={{ width: 8, height: 8, borderRadius: '2px', background: T.ink3, flexShrink: 0 }} />
					<Typography sx={{ fontSize: 13, fontWeight: 600, color: T.ink2 }}>Cash · 현금</Typography>
				</Stack>
				{!isSmallScreen ? (
					<>
						<Box sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: T.ink, textAlign: 'right' }}>
							<Amount value={cash} currency={currency} showSymbol />
						</Box>
						<Box />
						<Box />
					</>
				) : (
					<Box sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: T.ink, textAlign: 'right' }}>
						<Amount value={cash} currency={currency} showSymbol />
					</Box>
				)}
			</Box>

			{/* total row */}
			<Box sx={{
				...rowSx,
				borderBottom: 'none',
				borderTop: `2px solid ${T.rule}`,
				background: T.surf2,
				fontWeight: 700
			}}>
				<Typography sx={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Total</Typography>
				{!isSmallScreen ? (
					<>
						<Stack sx={{ textAlign: 'right' }}>
							<Box sx={{ ...sMono, fontSize: 13, fontWeight: 700, color: T.ink }}>
								<Amount value={totalBalance} currency={currency} showSymbol />
							</Box>
							<Typography sx={{ ...sMono, fontSize: 11, color: T.ink3, marginTop: '2px' }}>
								cost <Amount value={totals.costBasis} currency={currency} showSymbol />
							</Typography>
						</Stack>
						<Box sx={{ ...sMono, fontSize: 13, fontWeight: 700, textAlign: 'right' }}>
							<Amount value={totals.periodGain} currency={currency} showSymbol negativeColor />
						</Box>
						<Box sx={{
							...sMono,
							fontSize: 13,
							fontWeight: 700,
							textAlign: 'right',
							color: totals.periodReturn > 0 ? T.pos : totals.periodReturn < 0 ? T.neg : T.ink
						}}>
							{totals.costBasis !== 0
								? `${(totals.periodReturn / totals.costBasis * 100) >= 0 ? '+' : ''}${(totals.periodReturn / totals.costBasis * 100).toFixed(2)}%`
								: '—'}
						</Box>
					</>
				) : (
					<Stack sx={{ textAlign: 'right', minWidth: 110 }}>
						<Box sx={{ ...sMono, fontSize: 13, fontWeight: 700, color: T.ink }}>
							<Amount value={totalBalance} currency={currency} showSymbol />
						</Box>
						<Typography sx={{
							...sMono,
							fontSize: 11,
							marginTop: '2px',
							color: totals.periodReturn > 0 ? T.pos : totals.periodReturn < 0 ? T.neg : T.ink2
						}}>
							<Amount value={totals.periodGain} currency={currency} showSymbol negativeColor />
							{totals.costBasis !== 0
								? ` (${(totals.periodReturn / totals.costBasis * 100) >= 0 ? '+' : ''}${(totals.periodReturn / totals.costBasis * 100).toFixed(2)}%)`
								: ''}
						</Typography>
					</Stack>
				)}
			</Box>

		</Box>
	);
}

AccountInvestments.propTypes = {
	currency: PropTypes.string
};

export default AccountInvestments;
