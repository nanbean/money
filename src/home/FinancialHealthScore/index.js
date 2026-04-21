import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

import { calcSavingsScore, calcInvestmentScore, calcEmergencyScore, calcDebtScore, toDisplay, isInternalTransfer } from './utils';

const SCORE_GRADES = [
	{ min: 85, label: '최우수', emoji: '🏆', color: 'success.main' },
	{ min: 70, label: '좋음', emoji: '😊', color: 'success.main' },
	{ min: 50, label: '보통', emoji: '😐', color: 'warning.main' },
	{ min: 30, label: '주의', emoji: '😟', color: 'warning.main' },
	{ min: 0, label: '위험', emoji: '🚨', color: 'error.main' }
];

const getGrade = (score) => SCORE_GRADES.find(g => score >= g.min) || SCORE_GRADES[SCORE_GRADES.length - 1];


function HealthScoreTab ({ score, metrics }) {
	const theme = useTheme();
	const grade = getGrade(score);
	const [expandedIndex, setExpandedIndex] = useState(null);

	const scoreColor = score >= 70
		? theme.palette.success.main
		: score >= 50
			? theme.palette.warning.main
			: theme.palette.error.main;

	const handleToggle = (index) => {
		setExpandedIndex(prev => prev === index ? null : index);
	};

	return (
		<Box sx={{ px: 2, pb: 2 }}>
			<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
				<Box sx={{ width: 120, height: 120 }}>
					<ResponsiveContainer width="100%" height="100%">
						<RadialBarChart
							innerRadius="65%"
							outerRadius="100%"
							data={[{ value: score }]}
							startAngle={210}
							endAngle={-30}
						>
							<RadialBar
								dataKey="value"
								fill={scoreColor}
								background={{ fill: theme.palette.divider }}
								cornerRadius={4}
							/>
						</RadialBarChart>
					</ResponsiveContainer>
				</Box>
				<Stack alignItems="center">
					<Typography variant="h4" fontWeight="bold" color={scoreColor}>
						{score}
					</Typography>
					<Typography variant="body2">
						{grade.emoji} {grade.label}
					</Typography>
				</Stack>
			</Box>
			<Stack spacing={1}>
				{metrics.map((m, index) => (
					<Box
						key={m.label}
						onClick={() => handleToggle(index)}
						sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' }, p: 0.5 }}
					>
						<Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
							<Typography variant="caption">{m.label}</Typography>
							<Typography variant="caption" color="text.secondary">{m.score}/{m.max}</Typography>
						</Stack>
						<LinearProgress
							variant="determinate"
							value={(m.score / m.max) * 100}
							sx={{ height: 6, borderRadius: 3 }}
						/>
						{expandedIndex === index && m.detail && (
							<Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', display: 'block', mt: 0.5 }}>
								{m.detail}
							</Typography>
						)}
					</Box>
				))}
			</Stack>
		</Box>
	);
}


const fmt = (n) => Math.round(n).toLocaleString();
const pct = (n) => `${(n * 100).toFixed(1)}%`;

export default function FinancialHealthScore () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const accountList = useSelector((state) => state.accountList);
	const transactionsFetching = useSelector((state) => state.trascationsFetching);
	const { currency, exchangeRate, livingExpenseExempt = [] } = useSelector((state) => state.settings);

	const sym = currency === 'USD' ? '$' : '₩';

	const savingsScore = useMemo(
		() => calcSavingsScore(allAccountsTransactions, livingExpenseExempt),
		[allAccountsTransactions, livingExpenseExempt]
	);
	const investmentScore = useMemo(
		() => calcInvestmentScore(accountList, exchangeRate, currency),
		[accountList, exchangeRate, currency]
	);
	const emergencyScore = useMemo(
		() => calcEmergencyScore(accountList, allAccountsTransactions, exchangeRate, currency),
		[accountList, allAccountsTransactions, exchangeRate, currency]
	);
	const debtScore = useMemo(
		() => calcDebtScore(accountList, exchangeRate, currency),
		[accountList, exchangeRate, currency]
	);
	const score = savingsScore + investmentScore + emergencyScore + debtScore;

	// 실제 수치 계산 — 각 지표의 근거 숫자를 표시하기 위해
	const details = useMemo(() => {
		const threeMonthsAgo = moment().subtract(3, 'months').format('YYYY-MM-DD');

		// 저축률 — 최근 3개월 완성된 달 기준
		const lastMonthEnd = moment().subtract(1, 'months').endOf('month').format('YYYY-MM-DD');
		const pastTxns = allAccountsTransactions.filter(t => t.date >= threeMonthsAgo && t.date <= lastMonthEnd);
		const income = pastTxns.filter(t => t.amount > 0 && !isInternalTransfer(t)).reduce((s, t) => s + t.amount, 0);
		const expense = pastTxns
			.filter(t => t.amount < 0 && !livingExpenseExempt.some(e => t.category?.startsWith(e)))
			.reduce((s, t) => s + Math.abs(t.amount), 0);
		const savingsRate = income > 0 ? (income - expense) / income : 0;

		// 투자 비중
		const totalNetWorth = accountList
			.filter(a => !a.closed && !a.name.match(/_Cash/i))
			.reduce((s, a) => s + toDisplay(a, exchangeRate, currency), 0);
		const investmentTotal = accountList
			.filter(a => !a.closed && !a.name.match(/_Cash/i) && a.type === 'Invst')
			.reduce((s, a) => s + toDisplay(a, exchangeRate, currency), 0);
		const investRatio = totalNetWorth > 0 ? investmentTotal / totalNetWorth : 0;

		// 비상금
		const accountMap = new Map(accountList.map(a => [a._id, a]));
		const toTxDisplay = (t) => {
			const acc = accountMap.get(t.accountId);
			const txCurrency = acc?.currency || 'KRW';
			const abs = Math.abs(t.amount);
			if (txCurrency === currency) return abs;
			return currency === 'KRW' ? abs * exchangeRate : abs / exchangeRate;
		};
		const liquidAssets = accountList
			.filter(a => !a.closed && (a.type === 'Bank' || a.type === 'Cash') && !a.name.match(/_Cash/i))
			.reduce((s, a) => s + toDisplay(a, exchangeRate, currency), 0);
		const realExpenseTxns = allAccountsTransactions.filter(t =>
			t.date >= threeMonthsAgo && t.amount < 0 &&
			!isInternalTransfer(t)
		);
		const monthsWithData = new Set(realExpenseTxns.map(t => t.date.slice(0, 7))).size;
		const monthlyAvg = monthsWithData > 0
			? realExpenseTxns.reduce((s, t) => s + toTxDisplay(t), 0) / monthsWithData
			: 0;
		const liquidMonths = monthlyAvg > 0 ? liquidAssets / monthlyAvg : 0;

		// 부채 비율
		const assetTotal = accountList
			.filter(a => !a.closed && !a.name.match(/_Cash/i) && a.type !== 'Oth L')
			.reduce((s, a) => s + toDisplay(a, exchangeRate, currency), 0);
		const debtTotal = accountList
			.filter(a => !a.closed && !a.name.match(/_Cash/i) && a.type === 'Oth L')
			.reduce((s, a) => s + Math.abs(toDisplay(a, exchangeRate, currency)), 0);
		const debtRatio = assetTotal > 0 ? debtTotal / assetTotal : 0;

		return { savingsRate, income, expense, investmentTotal, totalNetWorth, investRatio, liquidAssets, monthlyAvg, liquidMonths, debtTotal, assetTotal, debtRatio };
	}, [allAccountsTransactions, accountList, exchangeRate, currency, livingExpenseExempt]);

	const metrics = [
		{
			label: '💰 저축률',
			score: savingsScore,
			max: 25,
			detail: details.income > 0
				? `최근 3개월 수입 ${sym}${fmt(details.income)} · 지출 ${sym}${fmt(details.expense)} → 저축률 ${pct(details.savingsRate)}`
				: '최근 3개월 수입 데이터 없음'
		},
		{
			label: '📈 투자비중',
			score: investmentScore,
			max: 25,
			detail: `투자 ${sym}${fmt(details.investmentTotal)} / 순자산 ${sym}${fmt(details.totalNetWorth)} = ${pct(details.investRatio)}`
		},
		{
			label: '🛡 비상금',
			score: emergencyScore,
			max: 25,
			detail: details.monthlyAvg > 0
				? `유동자산 ${sym}${fmt(details.liquidAssets)} / 월평균지출 ${sym}${fmt(details.monthlyAvg)} = ${details.liquidMonths.toFixed(1)}개월분`
				: '지출 데이터 없음'
		},
		{
			label: '💳 부채비율',
			score: debtScore,
			max: 25,
			detail: `부채 ${sym}${fmt(details.debtTotal)} / 자산 ${sym}${fmt(details.assetTotal)} = ${pct(details.debtRatio)}`
		}
	];

	if (accountList.length === 0 || transactionsFetching) return (
		<Box p={1}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ ml: 1, mb: 1 }}>
				<Typography variant="button">Financial Health</Typography>
			</Stack>
			<Skeleton variant="rounded" height={120} sx={{ mx: 2, mb: 1 }} />
			{[0, 1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={28} sx={{ mx: 2, mb: 0.5 }} />)}
		</Box>
	);

	return (
		<Box p={1}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ ml: 1, mb: 1 }}>
				<Typography variant="button">Financial Health</Typography>
			</Stack>
			<HealthScoreTab
				score={score}
				metrics={metrics}
			/>
		</Box>
	);
}
