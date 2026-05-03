import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import useT from '../../hooks/useT';
import { sDisplay, sMono, labelStyle, fmtCurrency } from '../../utils/designTokens';
import { NON_EXPENSE_CATEGORY } from '../../constants';

const isInternalTransfer = (t) => /^\[.*\]$/.test(t.category || '');
const isInvestmentTxn = (t) => !!(t.accountId && t.accountId.startsWith('account:Invst'));
// Match Spending page's monthly projection blend (src/views/Spending.js).
const INFLATION_RATE = 1.025;
const EXPENSE_TYPES = ['Bank', 'CCard', 'Cash'];

export default function HomeCashFlow () {
	const T = useT();
	const lab = labelStyle(T);

	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { exchangeRate, currency = 'KRW', livingExpenseExempt = [] } = useSelector((state) => state.settings || {});

	const { income, expense, livingExpense, budget, monthLabel, daysIn } = useMemo(() => {
		const monthStart = moment().startOf('month').format('YYYY-MM-DD');
		const monthEnd = moment().endOf('month').format('YYYY-MM-DD');
		const monthTxns = (allAccountsTransactions || []).filter(t =>
			t.date >= monthStart && t.date <= monthEnd && !isInternalTransfer(t) && !isInvestmentTxn(t)
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
		// Cash flow = every outflow this month (e.g. insurance, loan interest).
		const exp = monthTxns.filter(t => t.amount < 0).reduce((s, t) => s + conv(t), 0);
		// Living expense = budget-relevant outflows only. Mirrors Spending's
		// isExpenseTx (livingExpenseOnly=true): expense-type accounts only,
		// drop NON_EXPENSE_CATEGORY / uncategorized / internal transfers,
		// and match livingExpenseExempt against `category:subcategory`.
		const isLivingExpense = (t) => {
			if (!t.amount || t.amount >= 0) return false;
			const type = t.accountId ? t.accountId.split(':')[1] : null;
			if (!EXPENSE_TYPES.includes(type)) return false;
			if (!t.category) return false;
			if (t.category === NON_EXPENSE_CATEGORY) return false;
			if (isInternalTransfer(t)) return false;
			const fullCategory = t.subcategory ? `${t.category}:${t.subcategory}` : t.category;
			if (livingExpenseExempt.some(e => fullCategory.startsWith(e))) return false;
			return true;
		};
		const livingExp = monthTxns.filter(isLivingExpense).reduce((s, t) => s + conv(t), 0);

		// Budget = month-end projection of living expense (matches Spending's
		// per-month projection: blend current pace with last-year same-month
		// adjusted by inflation).
		const todayM = moment();
		const days = todayM.date();
		const daysInCurrentMonth = todayM.daysInMonth();
		const lastYearMonthStart = todayM.clone().subtract(1, 'year').startOf('month').format('YYYY-MM-DD');
		const lastYearMonthEnd = todayM.clone().subtract(1, 'year').endOf('month').format('YYYY-MM-DD');
		const lastYearLivingExp = (allAccountsTransactions || []).filter(t =>
			t.date >= lastYearMonthStart && t.date <= lastYearMonthEnd
			&& !isInternalTransfer(t) && !isInvestmentTxn(t)
			&& isLivingExpense(t)
		).reduce((s, t) => s + conv(t), 0);
		const weight = days / daysInCurrentMonth;
		const currentPace = days > 0 ? (livingExp / days) * daysInCurrentMonth : 0;
		const historical = lastYearLivingExp * INFLATION_RATE;
		const projectedLivingExp = Math.max(livingExp, Math.round(weight * currentPace + (1 - weight) * historical));

		const monthName = todayM.format('MMMM');
		return {
			income: inc,
			expense: exp,
			livingExpense: livingExp,
			budget: projectedLivingExp,
			monthLabel: monthName,
			daysIn: days
		};
	}, [allAccountsTransactions, accountList, exchangeRate, currency, livingExpenseExempt]);

	const net = income - expense;
	const netColor = net >= 0 ? T.pos : T.neg;
	const expensePct = budget > 0 ? Math.min(100, (livingExpense / budget) * 100) : 0;

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
					<Typography sx={{ fontSize: 12, color: T.ink2 }}>Spent of {fmtCurrency(budget, currency)} projection</Typography>
					<Typography sx={{ ...sMono, fontSize: 12, fontWeight: 600 }}>{fmtCurrency(livingExpense, currency)}</Typography>
				</Stack>
				<Box sx={{ height: 8, background: T.dark ? T.rule : '#fff', borderRadius: '4px', overflow: 'hidden' }}>
					<Box sx={{ height: '100%', background: T.neg, width: `${expensePct}%` }}/>
				</Box>
			</Box>
		</Box>
	);
}
