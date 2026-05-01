import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import moment from 'moment';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import useT from '../../hooks/useT';
import { sDisplay, sMono, fmtCurrencyFull } from '../../utils/designTokens';
import { resolveCategoryIcon } from '../../utils/categoryIcon';
import { resolveCategoryColor } from '../../utils/categoryColor';
import { openTransactionInModal } from '../../actions/ui/form/bankTransaction';
import BankTransactionModal from '../../components/BankTransactionModal';

const isInternalTransfer = (t) => /^\[.*\]$/.test(t.category || '');
const tint = (hex, alphaHex = '22') => `${hex}${alphaHex}`;

export default function HomeRecentActivity () {
	const T = useT();
	const dispatch = useDispatch();

	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const accountList = useSelector((state) => state.accountList);
	const { currency: displayCurrency = 'KRW', categoryIcons = {}, categoryColors = {} } = useSelector((state) => state.settings || {});

	const accountCurrencyMap = useMemo(() => {
		const map = {};
		(accountList || []).forEach(acc => { map[acc._id] = acc.currency || 'KRW'; });
		return map;
	}, [accountList]);

	const recent = useMemo(() => {
		const list = (allAccountsTransactions || []).filter(t => !isInternalTransfer(t));
		return [...list]
			.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
			.slice(0, 8)
			.map(t => ({
				...t,
				_currency: accountCurrencyMap[t.accountId] || t.currency || displayCurrency
			}));
	}, [allAccountsTransactions, accountCurrencyMap, displayCurrency]);

	const onClickRow = (t, idx) => () => {
		dispatch(openTransactionInModal({
			...t,
			date: t.date,
			amount: t.amount,
			memo: t.memo,
			isEdit: true,
			index: idx
		}));
	};

	return (
		<Box sx={{
			background: T.surf,
			border: `1px solid ${T.rule}`,
			borderRadius: '16px',
			padding: { xs: '16px', md: '20px' },
			color: T.ink
		}}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 1.5 }}>
				<Typography sx={{ ...sDisplay, fontSize: 18, fontWeight: 700, color: T.ink, margin: 0 }}>
					Recent activity
					<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 13 }}> · 최근 활동</Box>
				</Typography>
				<Link to="/transactions" style={{ textDecoration: 'none' }}>
					<Typography sx={{ fontSize: 12, color: T.acc.bright, fontWeight: 600, cursor: 'pointer' }}>
						See all →
					</Typography>
				</Link>
			</Stack>
			{recent.length === 0 && (
				<Typography sx={{ fontSize: 12, color: T.ink2, textAlign: 'center', py: 3 }}>
					No recent transactions
				</Typography>
			)}
			{recent.map((t, idx) => {
				const amt = Number(t.amount) || 0;
				const amtColor = amt > 0 ? T.pos : T.ink;
				const baseCat = (t.category || '').split(':')[0] || t.category || '';
				const Icon = resolveCategoryIcon(t.category, categoryIcons[baseCat]);
				const catColor = resolveCategoryColor(t.category, categoryColors[baseCat]);
				return (
					<Box
						key={t._id || idx}
						onClick={onClickRow(t, idx)}
						sx={{
							display: 'grid',
							gridTemplateColumns: '36px 1fr auto',
							gap: 1.5,
							alignItems: 'center',
							padding: '10px 0',
							borderTop: idx === 0 ? 'none' : `1px solid ${T.rule}`,
							cursor: 'pointer',
							'&:hover': { background: T.surf2 }
						}}
					>
						<Box sx={{
							width: 36,
							height: 36,
							borderRadius: '12px',
							background: tint(catColor, '22'),
							color: catColor,
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0
						}}>
							<Icon sx={{ fontSize: 16 }} />
						</Box>
						<Box sx={{ minWidth: 0 }}>
							<Typography sx={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
								{t.payee || baseCat || '—'}
							</Typography>
							<Typography sx={{ fontSize: 11, color: T.ink2 }}>
								{moment(t.date).format('MMM D')} · {t.account || '—'}
							</Typography>
						</Box>
						<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: amtColor }}>
							{amt > 0 ? '+' : amt < 0 ? '−' : ''}
							{fmtCurrencyFull(Math.abs(amt), t._currency)}
						</Typography>
					</Box>
				);
			})}
			<BankTransactionModal isEdit transactions={recent} />
		</Box>
	);
}
