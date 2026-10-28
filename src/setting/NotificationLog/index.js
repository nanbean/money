import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AppShortcutOutlinedIcon from '@mui/icons-material/AppShortcutOutlined';

import useT from '../../hooks/useT';
import { sDisplay, sMono, fmtCurrencyFull } from '../../utils/designTokens';
import { resolveCategoryIcon } from '../../utils/categoryIcon';
import { resolveCategoryColor } from '../../utils/categoryColor';

import { getNotificationsAction } from '../../actions/notificationActions';
import { summarizeReceipts, WINDOW_DAYS } from './receiptSummary';

const PAGE_FIRST = 20;
const PAGE_MORE = 50;
const PAGE_MAX = 500;

const fmtAgo = (ms) => {
	const min = Math.max(0, Math.round(ms / 60000));
	if (min < 60) return `${min}분 전`;
	const hours = Math.round(min / 60);
	if (hours < 48) return `${hours}시간 전`;
	return `${Math.round(hours / 24)}일 전`;
};

const parseDateFromId = (id) => {
	if (!id || typeof id !== 'string') return null;
	const m = id.match(/^(\d{4}-\d{2}-\d{2})/);
	return m ? m[1] : null;
};

const shortPackage = (pkg) => {
	if (!pkg) return '';
	const parts = pkg.split('.');
	return parts[parts.length - 1] || pkg;
};

export function NotificationLog () {
	const T = useT();
	const dispatch = useDispatch();
	const notifications = useSelector((state) => state.notifications);
	// 처음엔 20건(약 일주일치). '더 보기'로 50건씩 늘린다 — 카드 명세서와 한 달치를
	// 대조하려면 60~100건이 필요하다. 서버가 500건에서 자른다.
	const [size, setSize] = useState(PAGE_FIRST);
	const [loadingMore, setLoadingMore] = useState(false);

	useEffect(() => {
		dispatch(getNotificationsAction(PAGE_FIRST));
	}, [dispatch]);

	const loadMore = () => {
		const next = Math.min(size + PAGE_MORE, PAGE_MAX);
		setLoadingMore(true);
		Promise.resolve(dispatch(getNotificationsAction(next)))
			.finally(() => {
				setSize(next);
				setLoadingMore(false);
			});
	};

	const enriched = useMemo(() => {
		const list = Array.isArray(notifications) ? notifications : [];
		return list.map((n, idx) => ({
			...n,
			key: n._id || idx,
			date: parseDateFromId(n._id)
		}));
	}, [notifications]);

	// 상단은 '알림이 제대로 들어오고 있나'를 본다 — 마지막 수신, 최근 7일 건수, 앱별 건수.
	// (예전의 최근 3건 카드는 바로 아래 목록 맨 위와 같았고, 건수는 불러온 개수일 뿐이었다.)
	const receipt = useMemo(
		() => summarizeReceipts(enriched, size, Date.now()),
		[enriched, size]
	);

	const grouped = useMemo(() => {
		const map = new Map();
		enriched.forEach(n => {
			const key = n.date || 'unknown';
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(n);
		});
		return Array.from(map.entries());
	}, [enriched]);

	const renderRow = (n) => {
		const tx = n.transaction;
		const Icon = tx ? resolveCategoryIcon(tx.category) : NotificationsNoneOutlinedIcon;
		const dotColor = tx ? resolveCategoryColor(tx.category) : (T.dark ? '#3a3a4a' : '#cbd5e1');

		return (
			<Box key={n.key} sx={{
				display: 'grid',
				gridTemplateColumns: { xs: '40px 1fr', md: '40px 1.5fr 1fr 130px' },
				gap: 1.5,
				alignItems: 'center',
				padding: '12px',
				borderRadius: '10px',
				background: T.dark ? 'rgba(255,255,255,0.02)' : '#fafaf6',
				border: `1px solid ${T.rule}`,
				marginBottom: '6px'
			}}>
				<Box sx={{
					width: 40,
					height: 40,
					borderRadius: '12px',
					background: dotColor,
					color: '#fff',
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0
				}}>
					<Icon sx={{ fontSize: 18 }} />
				</Box>

				<Box sx={{ minWidth: 0 }}>
					<Typography sx={{
						fontSize: 13,
						fontWeight: 600,
						color: T.ink,
						display: 'flex',
						alignItems: 'center',
						gap: 0.75,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap'
					}}>
						<Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
							{n.title || '(no title)'}
						</Box>
						{tx && (
							<Box component="span" sx={{
								fontSize: 9,
								padding: '1px 6px',
								borderRadius: '4px',
								background: T.posBg,
								color: T.pos,
								fontWeight: 700,
								textTransform: 'uppercase',
								flexShrink: 0
							}}>
								Saved
							</Box>
						)}
					</Typography>
					<Typography sx={{
						fontSize: 11,
						color: T.ink2,
						marginTop: '2px',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap'
					}}>
						{n.text || '—'}
					</Typography>
				</Box>

				<Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
					{tx ? (
						<>
							<Typography sx={{
								fontSize: 12,
								fontWeight: 600,
								color: T.ink,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap'
							}}>
								{tx.payee || '—'}
							</Typography>
							<Typography sx={{ fontSize: 10, color: T.ink3, marginTop: '2px' }}>
								{tx.category || 'Uncategorized'}
							</Typography>
						</>
					) : (
						<Typography sx={{
							fontSize: 11,
							color: T.ink3,
							display: 'inline-flex',
							alignItems: 'center',
							gap: 0.5
						}}>
							<AppShortcutOutlinedIcon sx={{ fontSize: 12 }} />
							{shortPackage(n.packageName) || 'system'}
						</Typography>
					)}
				</Box>

				<Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
					{tx ? (
						<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap' }}>
							{fmtCurrencyFull(tx.amount, tx.currency)}
						</Typography>
					) : (
						<Typography sx={{ fontSize: 11, color: T.ink3 }}>—</Typography>
					)}
					<Typography sx={{ fontSize: 10, color: T.ink3, marginTop: '2px' }}>
						{n.date || 'unknown'}
					</Typography>
				</Box>
			</Box>
		);
	};

	return (
		<Stack spacing={2}>
			{/* Hero */}
			<Box sx={{
				background: T.dark
					? 'linear-gradient(135deg, #15151c 0%, #1d1d26 100%)'
					: `linear-gradient(135deg, ${T.acc.hero} 0%, ${T.acc.deep} 100%)`,
				color: '#fff',
				borderRadius: '20px',
				padding: { xs: '20px', md: '28px' },
				position: 'relative',
				overflow: 'hidden'
			}}>
				<Box sx={{
					position: 'absolute',
					top: -40,
					right: -40,
					width: 200,
					height: 200,
					borderRadius: '50%',
					background: `radial-gradient(circle, ${T.acc.bright}55 0%, transparent 70%)`,
					pointerEvents: 'none'
				}} />
				<Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-start' }} spacing={2} sx={{ position: 'relative' }}>
					<Box>
						<Typography sx={{
							fontSize: 11,
							color: 'rgba(255,255,255,0.7)',
							textTransform: 'uppercase',
							letterSpacing: '0.08em',
							fontWeight: 600
						}}>
							Notification log · 알림 기록
						</Typography>
						<Stack direction="row" alignItems="center" spacing={1} sx={{ marginTop: '10px' }}>
							<Box sx={{
								width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
								background: receipt.stale ? '#fbbf24' : '#34d399',
								boxShadow: `0 0 0 4px ${receipt.stale ? 'rgba(251,191,36,0.25)' : 'rgba(52,211,153,0.25)'}`
							}} />
							<Typography sx={{ ...sDisplay, fontSize: { xs: 24, md: 30 }, fontWeight: 700, lineHeight: 1.1 }}>
								{receipt.lastReceivedAt ? `마지막 수신 ${fmtAgo(receipt.sinceLastMs)}` : '수신 기록 없음'}
							</Typography>
						</Stack>
						{receipt.lastReceivedAt && (
							<Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: '6px' }}>
								{moment(receipt.lastReceivedAt).format('YYYY-MM-DD HH:mm')}
							</Typography>
						)}
						<Stack direction="row" spacing={1.5} sx={{ marginTop: '12px', fontSize: 12, color: 'rgba(255,255,255,0.85)', flexWrap: 'wrap', rowGap: 0.5 }}>
							<span>최근 {WINDOW_DAYS}일 {receipt.recentCount}{receipt.recentPartial ? '+' : ''}건</span>
							{receipt.sources.map(([name, count]) => (
								<span key={name}>· {name} {count}</span>
							))}
						</Stack>
						{receipt.stale && (
							<Typography sx={{ fontSize: 12, color: '#fde68a', marginTop: '10px' }}>
								이틀 넘게 새 알림이 없습니다. 휴대폰 단축어 자동화와 카드 앱 알림을 확인해 보세요.
							</Typography>
						)}
					</Box>
				</Stack>
			</Box>

			{/* List */}
			<Box sx={{
				background: T.surf,
				border: `1px solid ${T.rule}`,
				borderRadius: '16px',
				padding: { xs: '16px', md: '20px' },
				color: T.ink
			}}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 2, flexWrap: 'wrap', gap: 1 }}>
					<Typography sx={{ ...sDisplay, fontSize: 18, fontWeight: 700, color: T.ink, margin: 0, whiteSpace: 'nowrap' }}>
						All notifications
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 14, marginLeft: '6px' }}>· {enriched.length}건</Box>
					</Typography>
				</Stack>

				{grouped.length === 0 && (
					<Box sx={{ padding: '40px 0', textAlign: 'center', color: T.ink2 }}>
						<ReceiptLongOutlinedIcon sx={{ fontSize: 28, color: T.ink3 }} />
						<Typography sx={{ marginTop: '12px', fontSize: 14, fontWeight: 600, color: T.ink }}>
							No notifications yet
						</Typography>
					</Box>
				)}

				{grouped.map(([date, list]) => {
					const lab = date === 'unknown'
						? { en: 'Unknown date', ko: '날짜 미상' }
						: { en: moment(date).format('MMM D, YYYY'), ko: moment(date).format('M월 D일') };
					return (
						<Box key={date} sx={{ marginBottom: '22px' }}>
							<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ marginBottom: '10px' }}>
								<Typography sx={{
									fontSize: 11,
									fontWeight: 600,
									color: T.ink2,
									textTransform: 'uppercase',
									letterSpacing: '0.04em'
								}}>
									{lab.en} · {lab.ko} ({list.length})
								</Typography>
							</Stack>
							{list.map(renderRow)}
						</Box>
					);
				})}

				{/* 요청한 만큼 다 왔으면 더 있을 수 있다. 덜 왔으면 전부 받은 것이다. */}
				{enriched.length >= size && size < PAGE_MAX && (
					<Box sx={{ textAlign: 'center', marginTop: 1 }}>
						<Button variant="outlined" size="small" onClick={loadMore} disabled={loadingMore} sx={{ textTransform: 'none' }}>
							{loadingMore ? '불러오는 중…' : `더 보기 · ${PAGE_MORE}건`}
						</Button>
					</Box>
				)}
			</Box>
		</Stack>
	);
}

export default NotificationLog;
