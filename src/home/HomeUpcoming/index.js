import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import useT from '../../hooks/useT';
import { sDisplay, sMono, labelStyle, fmtCurrency } from '../../utils/designTokens';
import { openTransactionInModal } from '../../actions/ui/form/bankTransaction';

const isPaidFromTransactions = (payment, allAccountsTransactions) => {
	if (!allAccountsTransactions || !allAccountsTransactions.length) return false;
	const interval = payment.interval || 1;
	const startYearMonth = moment().subtract(interval - 1, 'months').format('YYYY-MM');
	const thisYearMonth = moment().format('YYYY-MM');
	return allAccountsTransactions.some(i => {
		if (payment.account === i.account && payment.payee === i.payee && payment.category === i.category) {
			if (!payment.subcategory || payment.subcategory === i.subcategory) {
				const ym = moment(i.date).format('YYYY-MM');
				if (ym >= startYearMonth && ym <= thisYearMonth) return true;
			}
		}
		return false;
	});
};

export default function HomeUpcoming () {
	const T = useT();
	const lab = labelStyle(T);
	const dispatch = useDispatch();

	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { paymentList = [], exchangeRate, currency = 'KRW' } = useSelector((state) => state.settings || {});

	const { items, totalKrw } = useMemo(() => {
		const validRate = (typeof exchangeRate === 'number' && exchangeRate > 0) ? exchangeRate : 1;
		const filtered = (paymentList || []).filter(p => p.valid && !isPaidFromTransactions(p, allAccountsTransactions));
		filtered.sort((a, b) => a.day - b.day);
		const top = filtered.slice(0, 4);
		const total = filtered.reduce((s, p) => {
			const krw = p.currency === 'USD' ? p.amount * validRate : p.amount;
			return s + krw;
		}, 0);
		return { items: top, totalKrw: total };
	}, [paymentList, allAccountsTransactions, exchangeRate]);

	const monthAbbrev = moment().format('MMM').toUpperCase();

	const onClick = (i, idx) => () => {
		dispatch(openTransactionInModal({
			account: i.account,
			accountId: i.accountId,
			date: moment().date(i.day).format('YYYY-MM-DD'),
			payee: i.payee,
			category: i.category + (i.subcategory ? `:${i.subcategory}` : ''),
			amount: i.amount,
			memo: i.memo,
			index: idx
		}));
	};

	return (
		<Box sx={{
			background: T.surf,
			border: `1px solid ${T.rule}`,
			borderRadius: '16px',
			padding: { xs: '16px', md: '20px' },
			color: T.ink,
			minHeight: 180
		}}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography sx={lab}>Upcoming · 예정</Typography>
				<Typography sx={{ ...sMono, fontSize: 11, color: T.ink2 }}>
					{fmtCurrency(totalKrw, currency)}
				</Typography>
			</Stack>
			<Box sx={{ mt: 1.75 }}>
				{items.length === 0 && (
					<Typography sx={{ fontSize: 12, color: T.ink2, textAlign: 'center', py: 3 }}>
						No upcoming payments
					</Typography>
				)}
				{items.map((p, idx) => (
					<Box
						key={`${p.account}-${p.payee}-${idx}`}
						onClick={onClick(p, idx)}
						sx={{
							display: 'grid',
							gridTemplateColumns: '40px 1fr auto',
							alignItems: 'center',
							gap: 1.5,
							padding: '10px 0',
							borderTop: idx === 0 ? 'none' : `1px solid ${T.rule}`,
							cursor: 'pointer',
							'&:hover': { background: T.surf2 }
						}}
					>
						<Box sx={{
							width: 36,
							height: 40,
							background: T.acc.bg,
							color: T.acc.deep,
							borderRadius: '8px',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							fontWeight: 700
						}}>
							<Box component="span" sx={{ fontSize: 9, fontWeight: 600, opacity: 0.7 }}>{monthAbbrev}</Box>
							<Box component="span" sx={{ ...sDisplay, fontSize: 16, lineHeight: 1 }}>{p.day}</Box>
						</Box>
						<Box sx={{ minWidth: 0 }}>
							<Typography sx={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
								{p.payee}
							</Typography>
							<Typography sx={{ fontSize: 11, color: T.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
								{p.account}
							</Typography>
						</Box>
						<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 600 }}>
							{fmtCurrency(p.amount, p.currency || currency)}
						</Typography>
					</Box>
				))}
			</Box>
		</Box>
	);
}
