import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import useT from '../../hooks/useT';
import { sDisplay, sMono, labelStyle, fmtCurrency } from '../../utils/designTokens';

const isInternalTransfer = (t) => /^\[.*\]$/.test(t.category || '');

export default function HomeCashFlow () {
	const T = useT();
	const lab = labelStyle(T);

	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { exchangeRate, currency = 'KRW', livingExpenseExempt = [] } = useSelector((state) => state.settings || {});

	const { income, expense, budget, monthLabel, daysIn } = useMemo(() => {
		const monthStart = moment().startOf('month').format('YYYY-MM-DD');
		const monthEnd = moment().endOf('month').format('YYYY-MM-DD');
		const monthTxns = (allAccountsTransactions || []).filter(t =>
			t.date >= monthStart && t.date <= monthEnd && !isInternalTransfer(t)
		);
		const accountMap = new Map((accountList || []).map(a => [a._id, a]));
		const conv = (t) => {
			const acc = accountMap.get(t.accountId);
			const txCur = acc?.currency || 'KRW';
			const abs = Math.abs(t.amount);
			if (txCur === currency) return abs;
			return currency === 'KRW' ? abs * exchangeRate : abs / exchangeRate;
		};
		const inc = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + conv(t), 0);
		const exp = monthTxns.filter(t => t.amount < 0 && !livingExpenseExempt.some(e => t.category?.startsWith(e))).reduce((s, t) => s + conv(t), 0);
		const monthName = moment().format('MMMM');
		const today = moment();
		const days = today.date();
		const bud = inc > 0 ? inc * 1.0 : exp;
		return { income: inc, expense: exp, budget: bud, monthLabel: monthName, daysIn: days };
	}, [allAccountsTransactions, accountList, exchangeRate, currency, livingExpenseExempt]);

	const net = income - expense;
	const netColor = net >= 0 ? T.pos : T.neg;
	const expensePct = budget > 0 ? Math.min(100, (expense / budget) * 100) : 0;

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
				<Typography sx={lab}>{monthLabel} cash flow · 현금 흐름</Typography>
				<Typography sx={{ fontSize: 11, color: T.ink2 }}>{daysIn} days in</Typography>
			</Stack>
			<Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1.75 }}>
				<Typography sx={{ ...sDisplay, fontSize: { xs: 28, md: 36 }, fontWeight: 700, color: netColor }}>
					{net >= 0 ? '+' : '−'}{fmtCurrency(Math.abs(net), currency)}
				</Typography>
				<Typography sx={{ fontSize: 13, color: T.ink2 }}>{net >= 0 ? 'net saved' : 'net spent'}</Typography>
			</Stack>
			<Box sx={{ mt: 2 }}>
				<Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12, mb: '6px' }}>
					<Typography sx={{ fontSize: 12, color: T.ink2 }}>Income</Typography>
					<Typography sx={{ ...sMono, fontSize: 12, fontWeight: 600 }}>{fmtCurrency(income, currency)}</Typography>
				</Stack>
				<Box sx={{ height: 8, background: T.dark ? T.rule : '#fff', borderRadius: '4px', overflow: 'hidden' }}>
					<Box sx={{ height: '100%', background: T.pos, width: '100%' }}/>
				</Box>
				<Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12, mt: 1.5, mb: '6px' }}>
					<Typography sx={{ fontSize: 12, color: T.ink2 }}>Spent of {fmtCurrency(budget, currency)} budget</Typography>
					<Typography sx={{ ...sMono, fontSize: 12, fontWeight: 600 }}>{fmtCurrency(expense, currency)}</Typography>
				</Stack>
				<Box sx={{ height: 8, background: T.dark ? T.rule : '#fff', borderRadius: '4px', overflow: 'hidden' }}>
					<Box sx={{ height: '100%', background: T.neg, width: `${expensePct}%` }}/>
				</Box>
			</Box>
		</Box>
	);
}
