import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import useT from '../../hooks/useT';
import { sDisplay, sMono, fmtCurrency, fmtCurrencyFull } from '../../utils/designTokens';
import { TYPE_ICON_MAP, TYPE_NAME_MAP } from '../../constants';

const TYPE_ORDER = ['Bank', 'CCard', 'Cash', 'Invst', 'Oth A', 'Oth L'];

const TYPE_KO = {
	'Bank': '은행',
	'CCard': '신용카드',
	'Cash': '현금',
	'Invst': '투자',
	'Oth L': '대출',
	'Oth A': '자산'
};

function TypeGroup ({ type, accounts, T, displayCurrency, validRate }) {
	const TypeIcon = TYPE_ICON_MAP[type];

	const conv = (a) => {
		const bal = Number(a.balance) || 0;
		const accCur = a.currency || 'KRW';
		if (accCur === displayCurrency) return bal;
		if (accCur === 'KRW') return bal / validRate;
		return bal * validRate;
	};

	const subtotal = accounts.reduce((s, a) => s + conv(a), 0);
	const subtotalColor = subtotal < 0 ? T.neg : T.ink;

	return (
		<Box sx={{
			background: T.surf,
			border: `1px solid ${T.rule}`,
			borderRadius: '16px',
			padding: { xs: '14px', md: '16px' },
			color: T.ink,
			display: 'flex',
			flexDirection: 'column',
			minWidth: 0,
			marginBottom: '16px',
			// keep group together in CSS multi-column flow
			breakInside: 'avoid',
			pageBreakInside: 'avoid',
			WebkitColumnBreakInside: 'avoid'
		}}>
			{/* Group header */}
			<Stack
				direction="row"
				alignItems="center"
				spacing={1}
				sx={{
					paddingBottom: 1.25,
					borderBottom: `1px solid ${T.rule}`,
					marginBottom: 0.5
				}}
			>
				<Box sx={{
					width: 26,
					height: 26,
					borderRadius: '8px',
					background: T.acc.bg,
					color: T.acc.deep,
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0
				}}>
					{TypeIcon && <TypeIcon sx={{ fontSize: 14 }} />}
				</Box>
				<Stack sx={{ flex: 1, minWidth: 0 }}>
					<Stack direction="row" alignItems="baseline" spacing={0.75}>
						<Typography sx={{
							fontSize: 12,
							fontWeight: 700,
							color: T.ink,
							textTransform: 'uppercase',
							letterSpacing: '0.04em'
						}}>
							{TYPE_NAME_MAP[type] || type}
						</Typography>
						<Typography sx={{ fontSize: 11, color: T.ink2 }}>
							· {TYPE_KO[type] || ''}
						</Typography>
					</Stack>
				</Stack>
				<Typography sx={{
					fontSize: 10,
					fontWeight: 600,
					color: T.ink3,
					...sMono,
					flexShrink: 0
				}}>
					{accounts.length}
				</Typography>
				<Typography sx={{
					...sMono,
					fontSize: 13,
					fontWeight: 700,
					color: subtotalColor,
					whiteSpace: 'nowrap',
					flexShrink: 0
				}}>
					{fmtCurrency(subtotal, displayCurrency)}
				</Typography>
			</Stack>

			{/* Rows */}
			<Stack>
				{accounts.map((a, idx) => {
					const bal = Number(a.balance) || 0;
					const balColor = bal < 0 ? T.neg : T.ink;
					return (
						<Link
							key={a._id || a.name}
							to={`/${a.type}/${a.name}`}
							style={{ textDecoration: 'none', color: 'inherit' }}
						>
							<Stack
								direction="row"
								alignItems="center"
								spacing={1}
								sx={{
									padding: '8px 4px',
									borderBottom: idx === accounts.length - 1 ? 'none' : `1px solid ${T.rule}`,
									cursor: 'pointer',
									transition: 'background 0.12s',
									'&:hover': { background: T.surf2 }
								}}
							>
								<Typography sx={{
									flex: 1,
									minWidth: 0,
									fontSize: 13,
									color: T.ink,
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap'
								}}>
									{a.name}
								</Typography>
								<Typography sx={{
									...sMono,
									fontSize: 13,
									fontWeight: 600,
									color: balColor,
									whiteSpace: 'nowrap'
								}}>
									{fmtCurrencyFull(bal, a.currency || 'KRW')}
								</Typography>
							</Stack>
						</Link>
					);
				})}
			</Stack>
		</Box>
	);
}

TypeGroup.propTypes = {
	accounts: PropTypes.array.isRequired,
	type: PropTypes.string.isRequired,
	displayCurrency: PropTypes.string,
	T: PropTypes.object,
	validRate: PropTypes.number
};

export default function HomeAccountsGrid () {
	const T = useT();

	const accountList = useSelector((state) => state.accountList);
	const { currency: displayCurrency = 'KRW', exchangeRate } = useSelector((state) => state.settings || {});

	const validRate = (typeof exchangeRate === 'number' && exchangeRate > 0) ? exchangeRate : 1;

	const grouped = useMemo(() => {
		const filtered = (accountList || []).filter(a => !a.closed && !a.name.match(/_Cash/i));
		const map = {};
		filtered.forEach(a => {
			const t = a.type || 'Other';
			if (!map[t]) map[t] = [];
			map[t].push(a);
		});
		// Sort each group by absolute balance desc
		Object.values(map).forEach(arr => {
			arr.sort((a, b) => Math.abs(Number(b.balance) || 0) - Math.abs(Number(a.balance) || 0));
		});
		// Order types by TYPE_ORDER, then any unknown types alphabetically
		const ordered = [
			...TYPE_ORDER.filter(t => map[t]),
			...Object.keys(map).filter(t => !TYPE_ORDER.includes(t)).sort()
		];
		return { ordered, map, total: filtered.length };
	}, [accountList]);

	if (grouped.total === 0) return null;

	return (
		<Box sx={{ marginBottom: '32px' }}>
			<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ margin: '12px 4px' }}>
				<Typography sx={{ ...sDisplay, fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>
					Accounts
					<Box component="span" sx={{ color: T.ink2, fontWeight: 400 }}> · 계좌</Box>
				</Typography>
				<Typography sx={{ fontSize: 12, color: T.ink2 }}>
					{grouped.total} accounts · {grouped.ordered.length} types
				</Typography>
			</Stack>
			<Box sx={{
				columnCount: { xs: 1, md: 2, lg: 3 },
				columnGap: '16px'
			}}>
				{grouped.ordered.map(type => (
					<TypeGroup
						key={type}
						type={type}
						accounts={grouped.map[type]}
						T={T}
						displayCurrency={displayCurrency}
						validRate={validRate}
					/>
				))}
			</Box>
		</Box>
	);
}
