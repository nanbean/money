import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AppShortcutOutlinedIcon from '@mui/icons-material/AppShortcutOutlined';

import useT from '../../hooks/useT';
import { sDisplay, sMono, fmtCurrency } from '../../utils/designTokens';
import { resolveCategoryIcon } from '../../utils/categoryIcon';
import { resolveCategoryColor } from '../../utils/categoryColor';

import { getNotificationsAction } from '../../actions/notificationActions';

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

	useEffect(() => {
		dispatch(getNotificationsAction());
	}, [dispatch]);

	const enriched = useMemo(() => {
		const list = Array.isArray(notifications) ? notifications : [];
		return list.map((n, idx) => ({
			...n,
			key: n._id || idx,
			date: parseDateFromId(n._id)
		}));
	}, [notifications]);

	const counts = useMemo(() => ({
		total: enriched.length,
		withTx: enriched.filter(n => n.transaction).length
	}), [enriched]);

	const recent = useMemo(() => enriched.slice(0, 3), [enriched]);

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
							{fmtCurrency(tx.amount, tx.currency)}
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
						<Typography sx={{ ...sDisplay, fontSize: { xs: 28, md: 36 }, fontWeight: 700, marginTop: '8px', lineHeight: 1.05 }}>
							{counts.total}
							<Box component="span" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400, fontSize: 14, marginLeft: '8px' }}>
								notifications
							</Box>
						</Typography>
						<Stack direction="row" spacing={1.5} sx={{ marginTop: '10px', fontSize: 12, color: 'rgba(255,255,255,0.7)', flexWrap: 'wrap' }}>
							<span>{counts.withTx} parsed transactions</span>
							<span>·</span>
							<span>{counts.total - counts.withTx} system</span>
						</Stack>
					</Box>
				</Stack>

				{recent.length > 0 && (
					<Box sx={{
						marginTop: '22px',
						display: 'grid',
						gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
						gap: '10px',
						position: 'relative'
					}}>
						{recent.map(n => {
							const tx = n.transaction;
							const Icon = tx ? resolveCategoryIcon(tx.category) : NotificationsNoneOutlinedIcon;
							return (
								<Box key={n.key} sx={{
									background: 'rgba(255,255,255,0.08)',
									border: '1px solid rgba(255,255,255,0.12)',
									borderRadius: '12px',
									padding: '12px',
									display: 'flex',
									alignItems: 'center',
									gap: '10px'
								}}>
									<Box sx={{
										width: 32,
										height: 32,
										borderRadius: '8px',
										background: tx ? resolveCategoryColor(tx.category) : 'rgba(255,255,255,0.18)',
										color: '#fff',
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										flexShrink: 0
									}}>
										<Icon sx={{ fontSize: 14 }} />
									</Box>
									<Box sx={{ flex: 1, minWidth: 0 }}>
										<Typography sx={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
											{n.title || '(no title)'}
										</Typography>
										<Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
											{tx ? `${tx.payee || ''} · ${fmtCurrency(tx.amount, tx.currency)}` : (n.date || shortPackage(n.packageName))}
										</Typography>
									</Box>
								</Box>
							);
						})}
					</Box>
				)}
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
			</Box>
		</Stack>
	);
}

export default NotificationLog;
