import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import moment from 'moment';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';

import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import useT from '../../hooks/useT';
import { sDisplay, sMono, fmtCurrency } from '../../utils/designTokens';

const isInternalTransfer = (t) => /^\[.*\]$/.test(t.category || '');

export const getISOWeekKey = () => {
	const now = new Date();
	if (now.getDay() === 1 && now.getHours() < 9) {
		now.setDate(now.getDate() - 2);
	}
	const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
	const day = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - day);
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
	return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const DISMISS_KEY = 'weeklyRecap_dismissed';

const getRecapWeekRange = () => {
	const dow = moment().day();
	const isMonEarly = dow === 1 && moment().hour() < 9;
	const ref = isMonEarly ? moment().subtract(2, 'days') : moment();
	const start = ref.clone().startOf('isoWeek');
	const end = ref.clone().endOf('isoWeek');
	return { start, end };
};

function StatCard ({ label, value, sub, color, T }) {
	return (
		<Box sx={{
			background: T.surf2,
			borderRadius: '12px',
			padding: '14px',
			minWidth: 0
		}}>
			<Typography sx={{ fontSize: 11, color: T.ink2, fontWeight: 500 }}>{label}</Typography>
			<Typography sx={{
				...sMono,
				fontSize: 18,
				fontWeight: 700,
				color: color || T.ink,
				marginTop: '4px',
				overflow: 'hidden',
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap'
			}}>
				{value}
			</Typography>
			{sub && (
				<Typography sx={{ fontSize: 10, color: T.ink2, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
					{sub}
				</Typography>
			)}
		</Box>
	);
}

export function WeeklyRecap ({ onDismiss }) {
	const T = useT();

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [recap, setRecap] = useState(null); // { comment, summary, spent, saved, topCategory }

	const accountList = useSelector((state) => state.accountList);
	const weeklyTransactions = useSelector((state) => state.weeklyTransactions || []);
	const { exchangeRate, currency = 'KRW', livingExpenseExempt = [] } = useSelector((state) => state.settings || {});

	const { start, end } = useMemo(() => getRecapWeekRange(), []);
	const dateLabel = `${start.format('MMM D')}–${end.format('D')}`;

	// Local fallback for the teaser headline (shown before/without API)
	const localStats = useMemo(() => {
		const accountMap = new Map((accountList || []).map(a => [a._id, a]));
		const conv = (t) => {
			const acc = accountMap.get(t.accountId);
			const txCur = acc?.currency || 'KRW';
			const abs = Math.abs(t.amount);
			if (txCur === currency) return abs;
			return currency === 'KRW' ? abs * exchangeRate : abs / exchangeRate;
		};
		const startStr = start.format('YYYY-MM-DD');
		const endStr = end.format('YYYY-MM-DD');
		const within = (weeklyTransactions || []).filter(t =>
			t.date >= startStr && t.date <= endStr && !isInternalTransfer(t)
		);
		const expenseTxns = within.filter(t =>
			t.amount < 0 && !livingExpenseExempt.some(e => t.category?.startsWith(e))
		);
		const incomeTxns = within.filter(t => t.amount > 0);
		const spent = expenseTxns.reduce((s, t) => s + conv(t), 0);
		const income = incomeTxns.reduce((s, t) => s + conv(t), 0);
		return { spent, saved: income - spent };
	}, [weeklyTransactions, accountList, exchangeRate, currency, livingExpenseExempt, start, end]);

	const fetchRecap = async () => {
		setLoading(true);
		setError('');
		try {
			const res = await fetch('/api/weeklyRecap');
			if (!res.ok) throw new Error('서버 오류가 발생했습니다.');
			const data = await res.json();
			setRecap(data);
		} catch (err) {
			setError(err.message || '분석 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	const handleOpen = (e) => {
		e?.stopPropagation();
		setOpen(true);
		if (!recap) fetchRecap();
	};

	const handleClose = () => setOpen(false);
	const handleDismiss = (e) => {
		e?.stopPropagation();
		onDismiss && onDismiss();
	};

	// Modal-displayed values prefer API result, fall back to local computation
	const spent = recap?.spent ?? localStats.spent;
	const saved = recap?.saved ?? localStats.saved;
	const topCategory = recap?.topCategory || null;
	const headline = recap?.summary
		|| (localStats.saved > 0
			? `지난주 ${fmtCurrency(localStats.saved, currency)} 저축했어요`
			: localStats.spent > 0
				? `지난주 ${fmtCurrency(localStats.spent, currency)} 지출했어요`
				: '');

	return (
		<>
			{/* Teaser row */}
			<Box
				onClick={handleOpen}
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: 2,
					padding: '14px 18px',
					background: T.surf,
					border: `1px solid ${T.rule}`,
					borderRadius: '14px',
					cursor: 'pointer',
					transition: 'transform 0.12s, border-color 0.12s',
					'&:hover': {
						transform: 'translateY(-1px)',
						borderColor: T.acc.bright
					}
				}}
			>
				<Box sx={{
					width: 36,
					height: 36,
					borderRadius: '10px',
					background: T.acc.bg,
					color: T.acc.deep,
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0
				}}>
					<PieChartOutlineIcon sx={{ fontSize: 18 }} />
				</Box>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Typography sx={{
						fontSize: 11,
						color: T.ink2,
						fontWeight: 600,
						textTransform: 'uppercase',
						letterSpacing: '0.06em'
					}}>
						Weekly recap · {dateLabel}
					</Typography>
					<Typography sx={{
						fontSize: 14,
						fontWeight: 600,
						marginTop: '2px',
						color: T.ink,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap'
					}}>
						{headline || 'AI의 이번 주 자산 변동 분석을 확인해 보세요.'}
					</Typography>
				</Box>
				<Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: T.acc.bright, flexShrink: 0 }}>
					<Typography sx={{ fontSize: 12, fontWeight: 600 }}>Read recap</Typography>
					<ChevronRightIcon sx={{ fontSize: 14 }} />
				</Stack>
				{onDismiss && (
					<IconButton
						size="small"
						onClick={handleDismiss}
						sx={{ color: T.ink2, marginLeft: 0.5, '&:hover': { color: T.ink, background: T.surf2 } }}
					>
						<CloseIcon sx={{ fontSize: 14 }} />
					</IconButton>
				)}
			</Box>

			{/* Modal */}
			{open && (
				<Box
					onClick={handleClose}
					sx={{
						position: 'fixed',
						inset: 0,
						background: 'rgba(0,0,0,0.5)',
						backdropFilter: 'blur(4px)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 1300,
						padding: 3
					}}
				>
					<Box
						onClick={e => e.stopPropagation()}
						sx={{
							background: T.surf,
							color: T.ink,
							borderRadius: '20px',
							padding: { xs: '20px', md: '32px' },
							maxWidth: 640,
							width: '100%',
							maxHeight: '90vh',
							overflow: 'auto',
							border: `1px solid ${T.rule}`
						}}
					>
						<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ marginBottom: 2.5 }}>
							<Box sx={{ minWidth: 0 }}>
								<Typography sx={{
									fontSize: 11,
									color: T.ink3,
									textTransform: 'uppercase',
									letterSpacing: '0.08em',
									fontWeight: 600
								}}>
									Weekly recap · 주간 회고
								</Typography>
								<Typography sx={{ ...sDisplay, fontSize: 28, fontWeight: 700, marginTop: '6px', color: T.ink }}>
									{start.format('MMM D')}–{end.format('D, YYYY')}
								</Typography>
							</Box>
							<IconButton
								onClick={handleClose}
								size="small"
								sx={{ background: T.rule, color: T.ink2, '&:hover': { background: T.surf2 } }}
							>
								<CloseIcon sx={{ fontSize: 18 }} />
							</IconButton>
						</Stack>

						{/* Headline (AI 20-char summary, fallback to local computation) */}
						{headline && (
							<Typography sx={{
								...sDisplay,
								fontSize: { xs: 20, md: 24 },
								fontWeight: 700,
								lineHeight: 1.35,
								marginBottom: 2.25,
								color: T.ink
							}}>
								{headline}
							</Typography>
						)}

						{/* Stat cards */}
						<Box sx={{
							display: 'grid',
							gridTemplateColumns: 'repeat(3, 1fr)',
							gap: 1.5,
							marginBottom: 2.5
						}}>
							<StatCard label="Spent" value={fmtCurrency(spent, currency)} color={T.neg} T={T} />
							<StatCard
								label="Saved"
								value={fmtCurrency(Math.abs(saved), currency)}
								sub={saved >= 0 ? 'saved' : 'overspent'}
								color={saved >= 0 ? T.pos : T.neg}
								T={T}
							/>
							<StatCard
								label="Top category"
								value={topCategory ? `${topCategory.name} ${topCategory.pct}%` : '—'}
								sub={topCategory ? fmtCurrency(topCategory.value, currency) : ''}
								T={T}
							/>
						</Box>

						{/* AI analysis (replaces "By category") */}
						{loading && (
							<Stack alignItems="center" sx={{ py: 4 }}>
								<CircularProgress size={28} sx={{ color: T.acc.hero }} />
								<Typography sx={{ fontSize: 12, color: T.ink2, marginTop: 1.5 }}>
									AI가 분석 중입니다...
								</Typography>
							</Stack>
						)}
						{!loading && error && (
							<Box sx={{ padding: 1.75, background: T.surf2, borderRadius: '12px', color: T.neg, fontSize: 13 }}>
								{error}
							</Box>
						)}
						{!loading && recap?.comment && (
							<Box sx={{
								padding: 2,
								background: T.surf2,
								color: T.ink,
								borderRadius: '12px',
								fontSize: 13,
								lineHeight: 1.7,
								'& h1, & h2, & h3, & h4': { fontSize: 14, fontWeight: 700, marginTop: 1.5, marginBottom: 0.5, color: T.ink },
								'& p': { marginTop: 0, marginBottom: 1 },
								'& ul, & ol': { paddingLeft: 2.5, marginBottom: 1, marginTop: 0 },
								'& li': { marginBottom: 0.5 },
								'& strong': { fontWeight: 700, color: T.acc.hero },
								'& hr': { borderColor: T.rule, marginY: 1.25 }
							}}>
								<ReactMarkdown>
									{recap.comment.replace(/(?<=\S)\*\*(?=[가-힣ㄱ-ㅎㅏ-ㅣ])/g, '** ')}
								</ReactMarkdown>
							</Box>
						)}
					</Box>
				</Box>
			)}
		</>
	);
}

export default WeeklyRecap;
