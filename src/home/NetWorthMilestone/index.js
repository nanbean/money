import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import confetti from 'canvas-confetti';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';

import Amount from '../../components/Amount';
import { getSum } from '../Summary';

const MILESTONES_KRW = [
	50_000_000, 100_000_000, 200_000_000, 300_000_000,
	500_000_000, 1_000_000_000, 2_000_000_000, 3_000_000_000,
	4_000_000_000, 5_000_000_000, 6_000_000_000, 7_000_000_000,
	8_000_000_000, 9_000_000_000, 10_000_000_000, 15_000_000_000
];
const MILESTONES_USD = [50000, 100000, 200000, 500000, 1_000_000];

const getNextMilestone = (netWorth, currency) => {
	const milestones = currency === 'USD' ? MILESTONES_USD : MILESTONES_KRW;
	const found = milestones.find(m => m > netWorth);
	if (found) return found;
	const unit = currency === 'USD' ? 1_000_000 : 1_000_000_000;
	const next = Math.ceil(netWorth / unit) * unit;
	return next > netWorth ? next : netWorth + unit;
};

const getPreviousMilestone = (netWorth, currency) => {
	const milestones = currency === 'USD' ? MILESTONES_USD : MILESTONES_KRW;
	return [...milestones].reverse().find(m => m <= netWorth) || 0;
};

export default function NetWorthMilestone () {
	const accountList = useSelector((state) => state.accountList);
	const { currency, exchangeRate } = useSelector((state) => state.settings);

	const summaryAccountList = useMemo(
		() => accountList.filter(i => i.closed === false && !i.name.match(/_Cash/i)),
		[accountList]
	);

	const sumKRW = useMemo(
		() => getSum(summaryAccountList, exchangeRate),
		[summaryAccountList, exchangeRate]
	);

	const normalizedNetWorth = currency === 'USD' ? sumKRW / exchangeRate : sumKRW;

	const prev = getPreviousMilestone(normalizedNetWorth, currency);
	const next = getNextMilestone(normalizedNetWorth, currency);
	const progress = normalizedNetWorth <= 0
		? 0
		: Math.min(100, Math.max(0, ((normalizedNetWorth - prev) / (next - prev)) * 100));

	const remaining = next - normalizedNetWorth;

	const passedMilestones = useMemo(() => {
		const milestones = currency === 'USD' ? MILESTONES_USD : MILESTONES_KRW;
		return milestones.filter(m => m <= normalizedNetWorth);
	}, [normalizedNetWorth, currency]);

	useEffect(() => {
		if (!normalizedNetWorth || normalizedNetWorth <= 0) return;

		const storageKey = 'netWorthMilestoneData';
		const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');

		if (!stored.lastMilestone) {
			const currentMilestone = getPreviousMilestone(normalizedNetWorth, currency);
			localStorage.setItem(storageKey, JSON.stringify({
				lastMilestone: currentMilestone,
				confettiDate: null
			}));
			return;
		}

		const currentMilestone = getPreviousMilestone(normalizedNetWorth, currency);
		const today = new Date().toISOString().slice(0, 10);

		if (currentMilestone > stored.lastMilestone && stored.confettiDate !== today) {
			confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
			localStorage.setItem(storageKey, JSON.stringify({
				lastMilestone: currentMilestone,
				confettiDate: today
			}));
		}
	}, [normalizedNetWorth, currency]);

	if (accountList.length === 0) return null;

	return (
		<Box sx={{ px: 2, pb: 2, pt: 1 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
				<Typography variant="caption" color="text.secondary">
					순자산 목표
				</Typography>
				<Typography variant="caption" color="text.secondary">
					{Math.round(progress)}%
				</Typography>
			</Stack>
			<LinearProgress
				variant="determinate"
				value={progress}
				sx={{ height: 8, borderRadius: 4, mb: 1 }}
			/>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="caption" color="text.secondary">
					다음 목표: <Amount value={next} currency={currency} showSymbol size="small" />
				</Typography>
				<Typography variant="caption" color="text.secondary">
					<Amount value={remaining} currency={currency} showSymbol size="small" /> 남음
				</Typography>
			</Stack>
			{passedMilestones.length > 0 && (
				<Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
					{passedMilestones.slice(-2).map(m => (
						<Typography key={m} variant="caption" color="success.main" sx={{ fontSize: '0.65rem', textAlign: 'center', flex: 1 }}>
							✓ <Amount value={m} currency={currency} showSymbol size="small" />
						</Typography>
					))}
					<Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', textAlign: 'center', flex: 1 }}>
						[ <Amount value={next} currency={currency} showSymbol size="small" /> ]
					</Typography>
				</Stack>
			)}
		</Box>
	);
}
